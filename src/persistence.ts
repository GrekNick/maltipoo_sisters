// Settings and best times, kept in this browser (localStorage). Storage can be missing or throw (private mode,
// previews), so every function degrades to defaults instead of failing. Functions take an optional store so
// tests can pass a fake one.

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface Settings {
    /** Draw the Arcade physics bodies (for grown-ups tuning levels) */
    showHitboxes: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { showHitboxes: false };

const SETTINGS_KEY = 'maltipoo.settings';
const SETTINGS_VERSION = 1;
const bestTimeKey = (levelId: string) => `maltipoo.best.${levelId}`;

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
        if (typeof saved === 'object' && saved !== null && 'showHitboxes' in saved && typeof saved.showHitboxes === 'boolean') {
            settings.showHitboxes = saved.showHitboxes;
        }
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

export interface BestTime {
    seconds: number;
    /** True when this run beat an earlier best time (not on the very first finish) */
    isNew: boolean;
}

/** Saves `seconds` if it beats the stored best time and returns the best time to show, or null without storage. */
export function recordBestTime(levelId: string, seconds: number, store: KeyValueStore | null = browserStore()): BestTime | null {
    if (!store) return null;
    try {
        const previous = Number(store.getItem(bestTimeKey(levelId))) || Infinity;
        if (seconds < previous) {
            store.setItem(bestTimeKey(levelId), String(seconds));
            return { seconds, isNew: previous !== Infinity };
        }
        return { seconds: previous, isNew: false };
    } catch {
        return null;
    }
}
