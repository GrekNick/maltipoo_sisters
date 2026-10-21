import { describe, it, expect } from 'vitest';
import {
    DEFAULT_SETTINGS, loadProgress, loadSettings, parseSettings, recordLevelFinish, saveLanguage, saveProgress, saveSettings,
    type KeyValueStore,
} from '../src/persistence';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
        data,
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => void data.set(key, value),
    };
}

const throwingStore: KeyValueStore = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
};

describe('settings', () => {
    it('round-trips through storage', () => {
        const store = memoryStore();
        saveSettings({ showHitboxes: true, language: 'uk' }, store);
        expect(loadSettings(store)).toEqual({ showHitboxes: true, language: 'uk' });
    });

    it('uses defaults when nothing is saved, the value is corrupt, or fields have the wrong type', () => {
        expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
        expect(parseSettings('{"showHitboxes":"yes"}')).toEqual(DEFAULT_SETTINGS);
        expect(parseSettings('[]')).toEqual(DEFAULT_SETTINGS);
    });

    it('ignores unknown fields', () => {
        expect(parseSettings('{"version":1,"showHitboxes":true,"cheats":true}')).toEqual({ showHitboxes: true, language: null });
    });

    it('saving the language keeps the other settings', () => {
        const store = memoryStore();
        saveSettings({ showHitboxes: true, language: null }, store);
        saveLanguage('pl', store);
        expect(loadSettings(store)).toEqual({ showHitboxes: true, language: 'pl' });
    });

    it('keeps only languages the game has (otherwise: follow the browser)', () => {
        expect(parseSettings('{"language":"pl"}').language).toBe('pl');
        expect(parseSettings('{"language":"de"}').language).toBeNull();
    });

    it('never throws when storage is missing or broken', () => {
        expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
        expect(loadSettings(throwingStore)).toEqual(DEFAULT_SETTINGS);
        expect(() => saveSettings({ showHitboxes: true, language: null }, throwingStore)).not.toThrow();
    });
});

describe('progress', () => {
    it('a finished level survives a reload (time and treats)', () => {
        const store = memoryStore();
        recordLevelFinish('level1', 30, 5, store);
        expect(loadProgress(store)).toEqual({ level1: { bestSeconds: 30, bestTreats: 5 } });
    });

    it('first finish is saved but not announced as a record; later runs keep the best of each', () => {
        const store = memoryStore();
        expect(recordLevelFinish('level1', 30, 5, store)?.best).toEqual({ seconds: 30, isNew: false });
        const faster = recordLevelFinish('level1', 25, 3, store);
        expect(faster?.best).toEqual({ seconds: 25, isNew: true });
        expect(faster?.treats).toEqual({ count: 5, isNew: false });
        expect(recordLevelFinish('level1', 40, 7, store)?.treats).toEqual({ count: 7, isNew: true });
        expect(loadProgress(store)).toEqual({ level1: { bestSeconds: 25, bestTreats: 7 } });
    });

    it('keeps levels separate', () => {
        const store = memoryStore();
        recordLevelFinish('level1', 30, 0, store);
        expect(recordLevelFinish('level2', 50, 0, store)?.best).toEqual({ seconds: 50, isNew: false });
        expect(Object.keys(loadProgress(store))).toEqual(['level1', 'level2']);
    });

    it('is saved with a version; an unknown version or corrupt value starts fresh', () => {
        const store = memoryStore();
        saveProgress({ level1: { bestSeconds: 30, bestTreats: 2 } }, store);
        expect(JSON.parse(store.data.get('maltipoo.progress') ?? '')).toMatchObject({ version: 1 });
        store.data.set('maltipoo.progress', JSON.stringify({ version: 99, levels: { level1: { bestSeconds: 1, bestTreats: 1 } } }));
        expect(loadProgress(store)).toEqual({});
        store.data.set('maltipoo.progress', '{not json');
        expect(loadProgress(store)).toEqual({});
    });

    it('picks up the best time saved by the old format (one key per level)', () => {
        const store = memoryStore();
        store.data.set('maltipoo.best.level1', '42.5');
        expect(loadProgress(store)).toEqual({ level1: { bestSeconds: 42.5, bestTreats: 0 } });
        expect(recordLevelFinish('level1', 50, 4, store)?.best).toEqual({ seconds: 42.5, isNew: false });
        expect(loadProgress(store)).toEqual({ level1: { bestSeconds: 42.5, bestTreats: 4 } });
    });

    it('never throws when storage is missing or broken', () => {
        expect(loadProgress(null)).toEqual({});
        expect(loadProgress(throwingStore)).toEqual({});
        expect(recordLevelFinish('level1', 30, 0, null)).toBeNull();
        expect(recordLevelFinish('level1', 30, 0, throwingStore)).toBeNull();
        expect(() => saveProgress({}, throwingStore)).not.toThrow();
    });
});
