import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, parseSettings, recordBestTime, saveSettings, type KeyValueStore } from '../src/persistence';

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

describe('best times', () => {
    it('first finish is saved but not announced as a new record', () => {
        const store = memoryStore();
        expect(recordBestTime('level1', 30, store)).toEqual({ seconds: 30, isNew: false });
    });

    it('a faster run is a new best; a slower one keeps the old best', () => {
        const store = memoryStore();
        recordBestTime('level1', 30, store);
        expect(recordBestTime('level1', 25, store)).toEqual({ seconds: 25, isNew: true });
        expect(recordBestTime('level1', 40, store)).toEqual({ seconds: 25, isNew: false });
    });

    it('keeps levels separate', () => {
        const store = memoryStore();
        recordBestTime('level1', 30, store);
        expect(recordBestTime('level2', 50, store)).toEqual({ seconds: 50, isNew: false });
    });

    it('returns null without working storage', () => {
        expect(recordBestTime('level1', 30, null)).toBeNull();
        expect(recordBestTime('level1', 30, throwingStore)).toBeNull();
    });
});
