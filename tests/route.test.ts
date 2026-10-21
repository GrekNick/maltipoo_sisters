import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels';
import {
    currentLocationIndex, isPlayable, levelToPlay, locationIndexOf, locationStatus, ROUTE, routeLevels, type Location,
} from '../src/levels/route';
import { NO_PROGRESS, type Progress } from '../src/progress';

const finished = (...ids: string[]): Progress => Object.fromEntries(ids.map(id => [id, { bestSeconds: 30, bestTreats: 0 }]));
const place = (id: string, levels: string[]): Location => ({ id, name: 'map.wieliczka', at: { x: 0, y: 0 }, levels });
// A made-up route: a place with two levels, one with one, one not built yet
const TEST_ROUTE = [place('mine', ['m1', 'm2']), place('bridge', ['b1']), place('castle', [])];

describe('the real route', () => {
    it('has every registered level exactly once, in registry order', () => {
        expect(routeLevels()).toEqual(LEVELS.map(level => level.key));
    });

    it('has the five places of the story, each with a unique id and a spot on the 800x600 map', () => {
        expect(ROUTE.map(location => location.id)).toEqual(['wieliczka', 'podgorze', 'kazimierz', 'rynek', 'wawel']);
        for (const { at } of ROUTE) {
            expect(at.x).toBeGreaterThan(40);
            expect(at.x).toBeLessThan(760);
            expect(at.y).toBeGreaterThan(80);
            expect(at.y).toBeLessThan(500); // above the info panel
        }
    });

    it('the first place can be played on a fresh start', () => {
        const first = ROUTE[0];
        expect(first && locationStatus(first, NO_PROGRESS)).toBe('open');
    });
});

describe('place status', () => {
    const status = (progress: Progress) => TEST_ROUTE.map(l => locationStatus(l, progress, TEST_ROUTE));

    it('fresh start: the first place is open, the next locked, unbuilt ones "soon"', () => {
        expect(status(NO_PROGRESS)).toEqual(['open', 'locked', 'soon']);
    });

    it('a place is done when all its levels are, and the next place opens after its last level', () => {
        expect(status(finished('m1'))).toEqual(['open', 'locked', 'soon']);
        expect(status(finished('m1', 'm2'))).toEqual(['done', 'open', 'soon']);
        expect(status(finished('m1', 'm2', 'b1'))).toEqual(['done', 'done', 'soon']);
    });

    it('open and done places can be played; locked and unbuilt ones cannot', () => {
        expect(['open', 'done', 'locked', 'soon'].map(s => isPlayable(s as never))).toEqual([true, true, false, false]);
    });
});

describe('which level a place starts', () => {
    const [mine] = TEST_ROUTE as [Location];

    it('its first unfinished level, or the last one when all are done', () => {
        expect(levelToPlay(mine, NO_PROGRESS)).toBe('m1');
        expect(levelToPlay(mine, finished('m1'))).toBe('m2');
        expect(levelToPlay(mine, finished('m1', 'm2'))).toBe('m2');
    });

    it('nothing for a place without levels', () => {
        expect(levelToPlay(place('empty', []), NO_PROGRESS)).toBeUndefined();
    });
});

describe('where the map opens', () => {
    it('at the place of the level to continue with', () => {
        expect(currentLocationIndex(NO_PROGRESS, TEST_ROUTE)).toBe(0);
        expect(currentLocationIndex(finished('m1', 'm2'), TEST_ROUTE)).toBe(1);
        expect(currentLocationIndex(finished('m1', 'm2', 'b1'), TEST_ROUTE)).toBe(1); // all done: the last level
    });

    it('finds the place of a level', () => {
        expect(locationIndexOf('b1', TEST_ROUTE)).toBe(1);
        expect(locationIndexOf('nope', TEST_ROUTE)).toBe(-1);
    });
});
