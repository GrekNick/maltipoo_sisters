import { describe, it, expect } from 'vitest';
import { continueLevel, isUnlocked, NO_PROGRESS, parseProgress, recordFinish, type Progress } from '../src/progress';

const LEVELS = ['wieliczka', 'podgorze', 'kazimierz'];
const finished = (...ids: string[]): Progress => Object.fromEntries(ids.map(id => [id, { bestSeconds: 30, bestTreats: 0 }]));

describe('unlocking', () => {
    it('the first level is always open, the rest are locked until the one before is finished', () => {
        expect(LEVELS.map(id => isUnlocked(LEVELS, NO_PROGRESS, id))).toEqual([true, false, false]);
        expect(LEVELS.map(id => isUnlocked(LEVELS, finished('wieliczka'), id))).toEqual([true, true, false]);
        expect(LEVELS.map(id => isUnlocked(LEVELS, finished('wieliczka', 'podgorze'), id))).toEqual([true, true, true]);
    });

    it('unknown levels are locked', () => {
        expect(isUnlocked(LEVELS, finished(...LEVELS), 'atlantis')).toBe(false);
    });

    it('finishing a level unlocks the next one', () => {
        const { progress } = recordFinish(NO_PROGRESS, 'wieliczka', 40, 3);
        expect(isUnlocked(LEVELS, progress, 'podgorze')).toBe(true);
    });
});

describe('continue', () => {
    it('goes to the first level not finished yet, or the last one when all are done', () => {
        expect(continueLevel(LEVELS, NO_PROGRESS)).toBe('wieliczka');
        expect(continueLevel(LEVELS, finished('wieliczka'))).toBe('podgorze');
        expect(continueLevel(LEVELS, finished(...LEVELS))).toBe('kazimierz');
        expect(continueLevel([], NO_PROGRESS)).toBeUndefined();
    });
});

describe('recording a finish', () => {
    it('keeps the faster time and the higher treat count, independently', () => {
        let progress = recordFinish(NO_PROGRESS, 'wieliczka', 40, 3).progress;
        progress = recordFinish(progress, 'wieliczka', 35, 1).progress;
        progress = recordFinish(progress, 'wieliczka', 50, 6).progress;
        expect(progress).toEqual({ wieliczka: { bestSeconds: 35, bestTreats: 6 } });
    });

    it('does not change the progress it was given', () => {
        const before = finished('wieliczka');
        recordFinish(before, 'podgorze', 20, 2);
        expect(before).toEqual(finished('wieliczka'));
    });
});

describe('parsing saved progress', () => {
    it('keeps valid entries and drops broken ones', () => {
        expect(parseProgress({
            ok: { bestSeconds: 30, bestTreats: 4 },
            noTreats: { bestSeconds: 12.5 },
            badTime: { bestSeconds: -1, bestTreats: 2 },
            notANumber: { bestSeconds: 'fast' },
            junk: 7,
        })).toEqual({ ok: { bestSeconds: 30, bestTreats: 4 }, noTreats: { bestSeconds: 12.5, bestTreats: 0 } });
    });

    it('anything that is not an object means no progress', () => {
        for (const value of [null, undefined, 3, 'level1', []]) expect(parseProgress(value)).toEqual(NO_PROGRESS);
    });
});
