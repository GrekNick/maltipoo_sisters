// Checks every Tiled map in levels/: it parses, it's registered, and it can be finished by a kid.
// New maps are picked up automatically. See docs/level-design.md for the rules in tile terms.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { LEVELS, TILESETS } from '../src/levels';
import { headroomAbove, parseTiledMap, TILE_SIZE, type LevelData, type TiledMap } from '../src/levels/tiled';
import { reachableFrom, surfaceAt } from '../src/levels/reachability';
import { PHYSICS } from '../src/physics';
import { CHARACTERS, SPRITE_SCALE } from '../src/characters';
import { asciiMap } from './helpers/asciiMap';

const MAP_FILES = fs.readdirSync('levels').filter(file => file.endsWith('.tmj')).sort();
const readMap = (file: string) => JSON.parse(fs.readFileSync(path.join('levels', file), 'utf8')) as TiledMap;

// Body heights on screen: the tallest standing dog, and the tallest ducked dog (only Sofi ducks)
const STANDING = Math.max(...Object.values(CHARACTERS).map(c => c.hitbox.height * SPRITE_SCALE));
const DUCKED = Math.max(...Object.values(CHARACTERS).flatMap(c => (c.crouchHitbox ? [c.crouchHitbox.height * SPRITE_SCALE] : [])));
const MARGIN = 4;

/** Surfaces (and the goal) that can't be reached from the spawn at walking speed. */
function unreachable(level: LevelData): string[] {
    const reachable = reachableFrom(level.surfaces, level.spawn, PHYSICS);
    const problems = level.surfaces.filter(s => !reachable.has(s.id)).map(s => `surface ${s.id}`);
    const goal = surfaceAt(level.surfaces, level.goal);
    if (!goal || !reachable.has(goal.id)) problems.push('goal');
    return problems;
}

/**
 * Columns where the space above a surface is a trap: too low to walk under standing, and not a proper duck gap
 * (or too low even ducked). 3+ free tiles = everyone, 2 free tiles = ducking only, 1 = nobody.
 */
function headroomProblems(level: LevelData): string[] {
    const problems: string[] = [];
    for (const surface of level.surfaces) {
        const row = surface.top / TILE_SIZE;
        for (let column = surface.left / TILE_SIZE; column < surface.right / TILE_SIZE; column++) {
            const headroom = headroomAbove(level, column, row);
            const walk = headroom >= STANDING + MARGIN;
            const duck = headroom >= DUCKED + MARGIN && headroom < STANDING;
            if (!walk && !duck) problems.push(`column ${column} above row ${row}: ${headroom}px of headroom`);
        }
    }
    return problems;
}

describe('dog sizes fit the 32px grid', () => {
    it('standing needs 3 tiles, ducking fits in 2', () => {
        expect(STANDING + MARGIN).toBeLessThanOrEqual(3 * TILE_SIZE);
        expect(STANDING).toBeGreaterThan(2 * TILE_SIZE);
        expect(DUCKED + MARGIN).toBeLessThanOrEqual(2 * TILE_SIZE);
    });
});

describe('level registry', () => {
    it('every map file in levels/ is registered, and every registered level has a map file', () => {
        expect(LEVELS.map(l => `${l.key}.tmj`).sort()).toEqual(MAP_FILES);
    });

    it('maps only use registered tilesets whose image exists', () => {
        for (const file of MAP_FILES) {
            for (const tileset of readMap(file).tilesets) {
                expect(TILESETS.map(t => t.name), `${file}: tileset "${tileset.name}"`).toContain(tileset.name);
                expect(fs.existsSync(path.join('levels', tileset.image ?? '')), `${file}: ${tileset.image}`).toBe(true);
            }
        }
    });
});

describe.each(MAP_FILES)('%s', (file) => {
    // Parsed inside each test so a broken map fails with its own clear message
    const level = () => parseTiledMap(file, readMap(file));

    it('is a valid map: layers, object classes, embedded tilesets, one spawn and one goal', () => {
        expect(() => level()).not.toThrow();
    });

    it('is at least one screen wide and tall', () => {
        expect(level().width).toBeGreaterThanOrEqual(800);
        expect(level().height).toBeGreaterThanOrEqual(600);
    });

    it('spawn, goal and checkpoints stand on a surface', () => {
        const { surfaces, spawn, goal, checkpoints } = level();
        for (const point of [spawn, goal, ...checkpoints]) expect(surfaceAt(surfaces, point), JSON.stringify(point)).toBeDefined();
    });

    it('every surface and the goal can be reached from the spawn at walking speed', () => {
        expect(unreachable(level())).toEqual([]);
    });

    it('headroom: room to walk under (3+ tiles) or a duck gap (2 tiles), never a 1-tile trap', () => {
        expect(headroomProblems(level())).toEqual([]);
    });
});

describe('the checks catch broken levels', () => {
    const objects = [{ type: 'spawn', column: 0, row: 3 }, { type: 'goal', column: 29, row: 3 }];

    it('a pit too wide to jump', () => {
        const level = parseTiledMap('wide-pit', asciiMap([
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '##########..........##########',
        ], objects));
        expect(unreachable(level)).toContain('goal');
    });

    it('a platform one tile above the ground (nobody fits under it)', () => {
        const level = parseTiledMap('trap', asciiMap([
            '..............................',
            '..............................',
            '..........=====...............',
            '..............................',
            '##############################',
        ], objects));
        expect(headroomProblems(level)).toHaveLength(5);
    });

    it('a duck gap (2 tiles) and a walk-under gap (3 tiles) are fine', () => {
        const level = parseTiledMap('ok', asciiMap([
            '..............................',
            '....=====.....................',
            '..........=====...............',
            '..............................',
            '..............................',
            '##############################',
        ], [{ type: 'spawn', column: 0, row: 4 }, { type: 'goal', column: 29, row: 4 }]));
        expect(headroomProblems(level)).toEqual([]);
    });
});
