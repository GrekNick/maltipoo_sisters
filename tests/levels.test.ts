// Checks every Tiled map in levels/: it parses, it's registered, and it can be finished by a kid.
// New maps are picked up automatically. See docs/level-design.md for the rules in tile terms.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { LEVELS, TILESETS } from '../src/levels';
import { DEFAULT_GATE_SISTER, headroomAbove, OBJECT_TYPES, parseTiledMap, TILE_SIZE, type LevelData, type TiledMap } from '../src/levels/tiled';
import { jumpDistance, maxJumpHeight, reachableFrom, surfaceAt } from '../src/levels/reachability';
import { PHYSICS, SISTER_PHYSICS } from '../src/physics';
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

/** Treats that can't be collected: no reachable surface below them within jump height (body height included). */
function unreachablePickups(level: LevelData): string[] {
    const reachable = reachableFrom(level.surfaces, level.spawn, PHYSICS);
    const jumpReach = maxJumpHeight(PHYSICS) * 0.85 + STANDING;
    return level.pickups
        .filter(p => !level.surfaces.some(s => reachable.has(s.id) && p.x >= s.left && p.x <= s.right && p.y <= s.top && s.top - p.y <= jumpReach))
        .map(p => `pickup at (${Math.round(p.x)}, ${Math.round(p.y)})`);
}

/** Puddles that are too wide to jump at walking speed, or that sit on the spawn, a checkpoint or the goal. */
function hazardProblems(level: LevelData): string[] {
    const longestJump = (jumpDistance(0, PHYSICS) ?? 0) * 0.85;
    const problems: string[] = [];
    for (const h of level.hazards) {
        if (h.width > longestJump) problems.push(`hazard at x=${h.x} is ${h.width}px wide (longest easy jump ${Math.round(longestJump)}px)`);
        for (const point of [level.spawn, level.goal, ...level.checkpoints]) {
            const covered = point.x >= h.x - 32 && point.x <= h.x + h.width + 32 && point.y >= h.y && point.y <= h.y + h.height + 1;
            if (covered) problems.push(`hazard at x=${h.x} covers the point at x=${Math.round(point.x)}`);
        }
    }
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

describe('Tiled project file', () => {
    const project = JSON.parse(fs.readFileSync('levels/maltipoo.tiled-project', 'utf8')) as {
        propertyTypes: Array<{ name: string; type: string; members?: Array<{ name: string; value: unknown }> }>;
    };
    const classes = project.propertyTypes.filter(t => t.type === 'class');

    it('offers exactly the object classes the game understands', () => {
        expect(classes.map(c => c.name).sort()).toEqual([...OBJECT_TYPES].sort());
    });

    it("the sister gate's default sister matches the parser's default", () => {
        const gate = classes.find(c => c.name === 'sister-gate');
        expect(gate?.members?.find(m => m.name === 'sister')?.value).toBe(DEFAULT_GATE_SISTER);
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

    it('every treat can be collected', () => {
        expect(unreachablePickups(level())).toEqual([]);
    });

    it('every puddle can be jumped and keeps away from spawn, checkpoints and goal', () => {
        expect(hazardProblems(level())).toEqual([]);
    });
});

describe('sister skills', () => {
    it("Kiwi's big jump reaches a ledge 6 tiles up; Sofi's jump doesn't", () => {
        const level = parseTiledMap('high-ledge', asciiMap([
            '..............................',
            '..............................',
            '..............................',
            '..........=====...............',
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '##############################',
        ], [{ type: 'spawn', column: 0, row: 8 }, { type: 'goal', column: 29, row: 8 }]));
        const ledge = level.surfaces.find(s => s.top === 3 * TILE_SIZE);
        expect(ledge).toBeDefined();
        expect(reachableFrom(level.surfaces, level.spawn, SISTER_PHYSICS.kiwi).has(ledge!.id)).toBe(true);
        expect(reachableFrom(level.surfaces, level.spawn, SISTER_PHYSICS.sofi).has(ledge!.id)).toBe(false);
    });

    it('the level checks use the shared numbers, which no sister falls short of', () => {
        for (const physics of Object.values(SISTER_PHYSICS)) {
            expect(maxJumpHeight(physics)).toBeGreaterThanOrEqual(maxJumpHeight(PHYSICS));
            expect(physics.walkSpeed).toBeGreaterThanOrEqual(PHYSICS.walkSpeed);
        }
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

    it('a treat placed out of reach', () => {
        const level = parseTiledMap('high-treat', asciiMap([
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '..............................',
            '##############################',
        ], [{ type: 'spawn', column: 0, row: 7 }, { type: 'goal', column: 29, row: 7 }, { type: 'pickup', column: 10, row: 0 }]));
        expect(unreachablePickups(level)).toHaveLength(1);
    });

    it('a puddle too wide to jump, and one on top of the spawn', () => {
        const level = parseTiledMap('puddles', asciiMap([
            '..............................',
            '..............................',
            '##############################',
        ], [
            { type: 'spawn', column: 0, row: 1 }, { type: 'goal', column: 29, row: 1 },
            { type: 'hazard', column: 10, row: 1, width: 8, height: 1 },
            { type: 'hazard', column: 0, row: 1, width: 1, height: 1 },
        ]));
        expect(hazardProblems(level)).toHaveLength(2);
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
