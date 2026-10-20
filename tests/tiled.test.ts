import { describe, it, expect } from 'vitest';
import { headroomAbove, parseTiledMap, type TiledMap } from '../src/levels/tiled';
import { asciiMap } from './helpers/asciiMap';

const SPAWN_GOAL = [{ type: 'spawn', column: 0, row: 0 }, { type: 'goal', column: 9, row: 0 }];

describe('parseTiledMap', () => {
    it('finds surfaces: solid tiles with free space above', () => {
        const level = parseTiledMap('t', asciiMap([
            '..........',
            '...===....',
            '..........',
            '##########',
        ], SPAWN_GOAL));
        expect(level.surfaces.map(s => s.id).sort()).toEqual(['r1c3', 'r3c0']);
        expect(level.surfaces.find(s => s.id === 'r1c3')).toMatchObject({ left: 96, right: 192, top: 32 });
        expect(level.surfaces.find(s => s.id === 'r3c0')).toMatchObject({ left: 0, right: 320, top: 96 });
    });

    it('decoration tiles are not solid', () => {
        const level = parseTiledMap('t', asciiMap([
            '..*.......',
            '##########',
        ], SPAWN_GOAL));
        expect(level.isSolid(2, 0)).toBe(false);
        expect(level.surfaces).toHaveLength(1);
    });

    it('drops spawn, goal and checkpoints onto the ground below them', () => {
        const level = parseTiledMap('t', asciiMap([
            '..........',
            '..........',
            '##########',
        ], [...SPAWN_GOAL, { type: 'checkpoint', column: 6, row: 0 }, { type: 'checkpoint', column: 3, row: 1 }]));
        expect(level.spawn).toEqual({ x: 16, y: 64 });
        expect(level.goal).toEqual({ x: 9 * 32 + 16, y: 64 });
        expect(level.checkpoints.map(c => c.x)).toEqual([3 * 32 + 16, 6 * 32 + 16]); // sorted left to right
    });

    it('measures headroom in pixels (Infinity under open sky)', () => {
        const level = parseTiledMap('t', asciiMap([
            '..........',
            '.===......',
            '..........',
            '..........',
            '##########',
        ], SPAWN_GOAL));
        expect(headroomAbove(level, 2, 4)).toBe(64);
        expect(headroomAbove(level, 6, 4)).toBe(Infinity);
    });

    it('ignores the flip flags Tiled stores in the top bits of a tile id', () => {
        const map = asciiMap(['..........', '##########'], SPAWN_GOAL);
        const ground = map.layers[0] as { data: number[] };
        ground.data[10] = 0x80000001; // ground tile, flipped horizontally
        expect(parseTiledMap('t', map).isSolid(0, 1)).toBe(true);
    });

    it('accepts the "class" key that Tiled 1.9 wrote instead of "type"', () => {
        const map = asciiMap(['..........', '##########'], SPAWN_GOAL);
        const objects = (map.layers[1] as { objects: Array<{ type?: string; class?: string }> }).objects;
        objects.forEach(o => { o.class = o.type; delete o.type; });
        expect(() => parseTiledMap('t', map)).not.toThrow();
    });
});

describe('pickups, hazards and sister gates', () => {
    const ground = ['..........', '..........', '##########'];

    it('pickups stay exactly where they were placed (they may float)', () => {
        const level = parseTiledMap('t', asciiMap(ground, [...SPAWN_GOAL, { type: 'pickup', column: 4, row: 0 }]));
        expect(level.pickups).toEqual([{ x: 4 * 32 + 16, y: 16 }]);
    });

    it('hazards are rectangles', () => {
        const level = parseTiledMap('t', asciiMap(ground, [...SPAWN_GOAL, { type: 'hazard', column: 3, row: 1, width: 2, height: 1 }]));
        expect(level.hazards).toEqual([{ x: 96, y: 32, width: 64, height: 32 }]);
    });

    it('a hazard drawn as a point is rejected', () => {
        expect(() => parseTiledMap('t', asciiMap(ground, [...SPAWN_GOAL, { type: 'hazard', column: 3, row: 1 }]))).toThrow(/rectangle/);
    });

    it('sister gates drop onto the ground and default to Sofi', () => {
        const level = parseTiledMap('t', asciiMap(ground, [
            ...SPAWN_GOAL,
            { type: 'sister-gate', column: 2, row: 0 },
            { type: 'sister-gate', column: 6, row: 0, properties: [{ name: 'sister', type: 'string', value: 'kiwi' }] },
        ]));
        expect(level.sisterGates).toEqual([{ x: 2 * 32 + 16, y: 64, sister: 'sofi' }, { x: 6 * 32 + 16, y: 64, sister: 'kiwi' }]);
    });

    it('a sister gate naming someone else is rejected', () => {
        const gate = { type: 'sister-gate', column: 2, row: 0, properties: [{ name: 'sister', type: 'string', value: 'smok' }] };
        expect(() => parseTiledMap('t', asciiMap(ground, [...SPAWN_GOAL, gate]))).toThrow(/sister "smok"/);
    });
});

describe('parseTiledMap rejects broken maps with a clear message', () => {
    const valid = () => asciiMap(['..........', '##########'], SPAWN_GOAL);
    const broken = (change: (map: TiledMap) => void) => { const map = valid(); change(map); return () => parseTiledMap('t', map); };

    it('external tilesets (Phaser can only load embedded ones)', () => {
        expect(broken(m => { m.tilesets[0]!.source = 'placeholder.tsx'; })).toThrow(/embed/i);
    });
    it('missing Ground or Objects layer', () => {
        expect(broken(m => { m.layers[0]!.name = 'Tiles'; })).toThrow(/"Ground"/);
        expect(broken(m => { m.layers[1]!.name = 'Things'; })).toThrow(/"Objects"/);
    });
    it('wrong tile size or infinite maps', () => {
        expect(broken(m => { m.tilewidth = 16; })).toThrow(/32x32/);
        expect(broken(m => { m.infinite = true; })).toThrow(/infinite/);
    });
    it('unknown object classes, and missing or duplicate spawn/goal', () => {
        expect(() => parseTiledMap('t', asciiMap(['..........', '##########'], [...SPAWN_GOAL, { type: 'coin', column: 4, row: 0 }]))).toThrow(/unknown class "coin"/);
        expect(() => parseTiledMap('t', asciiMap(['..........', '##########'], [SPAWN_GOAL[1]!]))).toThrow(/exactly one "spawn"/);
        expect(() => parseTiledMap('t', asciiMap(['..........', '##########'], [...SPAWN_GOAL, SPAWN_GOAL[1]!]))).toThrow(/exactly one "goal"/);
    });
    it('objects with no ground below them (placed over a pit)', () => {
        expect(() => parseTiledMap('t', asciiMap(['..........', '#######...'], SPAWN_GOAL))).toThrow(/no ground below/);
    });
});
