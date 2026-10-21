// Settings and progress, kept in this browser (localStorage). Storage can be missing or throw (private mode,
// previews), so every function degrades to defaults instead of failing. Functions take an optional store so
// tests can pass a fake one. Each value is saved with a version number, so a later format can migrate it.
import { isLanguage, type Language } from './i18n';
import { isTouchControlsSetting, type TouchControlsSetting } from './input/touch';
import { NO_PROGRESS, parseProgress, recordFinish, type FinishResult, type Progress } from './progress';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Settings {
    /** Draw the Arcade physics bodies (for grown-ups tuning levels) */
    showHitboxes: boolean;
    /** Chosen in Settings; null = follow the browser's language */
    language: Language | null;
    /** On-screen buttons: auto (touch devices), always on, or off */
    touchControls: TouchControlsSetting;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { showHitboxes: false, language: null, touchControls: 'auto' };

const SETTINGS_KEY = 'maltipoo.settings';
const SETTINGS_VERSION = 1;
const PROGRESS_KEY = 'maltipoo.progress';
const PROGRESS_VERSION = 1;
// Before v1 of the progress, each best time had its own key. Only level1 existed then.
const legacyBestTimeKey = (levelId: string) => `maltipoo.best.${levelId}`;
const LEGACY_LEVEL_IDS = ['level1'];

function browserStore(): KeyValueStore | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/** Reads saved settings, keeping only known fields with the right types; anything else falls back to defaults. */
export function parseSettings(raw: string | null): Settings {
    const settings: Settings = { ...DEFAULT_SETTINGS };
    if (!raw) return settings;
    try {
        const saved: unknown = JSON.parse(raw);
        if (typeof saved !== 'object' || saved === null) return settings;
        if ('showHitboxes' in saved && typeof saved.showHitboxes === 'boolean') settings.showHitboxes = saved.showHitboxes;
        if ('language' in saved && isLanguage(saved.language)) settings.language = saved.language;
        if ('touchControls' in saved && isTouchControlsSetting(saved.touchControls)) settings.touchControls = saved.touchControls;
    } catch {
        // corrupted value: use defaults
    }
    return settings;
}

export function loadSettings(store: KeyValueStore | null = browserStore()): Settings {
    try {
        return parseSettings(store?.getItem(SETTINGS_KEY) ?? null);
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings: Settings, store: KeyValueStore | null = browserStore()): void {
    try {
        store?.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, ...settings }));
    } catch {
        // can't save: the settings still apply for this session
    }
}

/** Saves the chosen language, keeping the other settings. */
export function saveLanguage(language: Language, store: KeyValueStore | null = browserStore()): void {
    saveSettings({ ...loadSettings(store), language }, store);
}

/** Finished levels with their best time and treat count. Nothing saved yet: picks up the old best times. */
export function loadProgress(store: KeyValueStore | null = browserStore()): Progress {
    try {
        const raw = store?.getItem(PROGRESS_KEY);
        if (raw === null || raw === undefined) return legacyProgress(store);
        const saved: unknown = JSON.parse(raw);
        // A format this version doesn't know (e.g. saved by a newer game): start fresh rather than misread it
        if (typeof saved !== 'object' || saved === null || !('version' in saved) || saved.version !== PROGRESS_VERSION) return NO_PROGRESS;
        return parseProgress('levels' in saved ? saved.levels : null);
    } catch {
        return NO_PROGRESS;
    }
}

export function saveProgress(progress: Progress, store: KeyValueStore | null = browserStore()): void {
    try {
        store?.setItem(PROGRESS_KEY, JSON.stringify({ version: PROGRESS_VERSION, levels: progress }));
    } catch {
        // can't save: progress lasts until the page is closed
    }
}

/** Saves a finished run and returns the records to show, or null without working storage. */
export function recordLevelFinish(
    levelId: string, seconds: number, treats: number, store: KeyValueStore | null = browserStore(),
): FinishResult | null {
    if (!store) return null;
    try {
        const result = recordFinish(loadProgress(store), levelId, seconds, treats);
        store.setItem(PROGRESS_KEY, JSON.stringify({ version: PROGRESS_VERSION, levels: result.progress }));
        return result;
    } catch {
        return null;
    }
}

/** Settings → Reset progress: deletes every saved best time and treat count (settings are kept). */
export function resetProgress(store: KeyValueStore | null = browserStore()): boolean {
    try {
        store?.removeItem(PROGRESS_KEY);
        LEGACY_LEVEL_IDS.forEach(id => store?.removeItem(legacyBestTimeKey(id)));
        return store !== null;
    } catch {
        return false;
    }
}

function legacyProgress(store: KeyValueStore | null | undefined): Progress {
    const progress: Record<string, unknown> = {};
    for (const id of LEGACY_LEVEL_IDS) {
        const seconds = Number(store?.getItem(legacyBestTimeKey(id)));
        if (seconds > 0) progress[id] = { bestSeconds: seconds, bestTreats: 0 };
    }
    return parseProgress(progress);
}
