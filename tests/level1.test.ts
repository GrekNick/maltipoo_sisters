import { describe, it, expect } from 'vitest';
import { level1 } from '../src/levels/level1';
import { PHYSICS } from '../src/physics';
import { CHARACTERS, SPRITE_SCALE } from '../src/characters';
import { surfacesOf, reachableSurfaceIds, goalSurface } from '../src/levels/reachability';
import type { Level } from '../src/levels/types';

const PLATFORM_THICKNESS = 32;
// Tallest physics body on screen (px), plus a little room so walking under doesn't snag
const DOG_HEIGHT = Math.max(...Object.values(CHARACTERS).map(c => c.hitbox.height * SPRITE_SCALE));
const HEADROOM = DOG_HEIGHT + 4;

type Span = { left: number; right: number };
const overlapsX = (a: Span, b: Span) => a.left < b.right && b.left < a.right;

describe('level1 layout', () => {
    const level = level1;

    it('spawn and goal stand on the ground inside the world', () => {
        const onGround = (x: number) => level.ground.some(([from, to]) => x >= from && x <= to);
        expect(level.spawn.y).toBe(level.groundY);
        expect(onGround(level.spawn.x)).toBe(true);
        expect(onGround(level.goal.x)).toBe(true);
        expect(level.goal.x).toBeLessThan(level.width);
    });

    it('ground segments are ordered and do not overlap', () => {
        level.ground.forEach(([from, to], i) => {
            expect(to).toBeGreaterThan(from);
            if (i > 0) expect(from).toBeGreaterThan(level.ground[i - 1]![1]);
        });
    });

    it('every platform is inside the world and above the ground', () => {
        for (const p of level.platforms) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x + p.width).toBeLessThanOrEqual(level.width);
            expect(p.y + PLATFORM_THICKNESS).toBeLessThanOrEqual(level.groundY);
        }
    });

    it('platforms do not overlap each other', () => {
        const boxes = level.platforms.map(p => ({ left: p.x, right: p.x + p.width, top: p.y, bottom: p.y + PLATFORM_THICKNESS }));
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => {
            const overlapsY = a.top < b.bottom && b.top < a.bottom;
            expect(overlapsX(a, b) && overlapsY).toBe(false);
        }));
    });

    it('the dog can walk under every platform that hangs over the ground', () => {
        const ground = level.ground.map(([from, to]) => ({ left: from, right: to }));
        for (const p of level.platforms) {
            const box = { left: p.x, right: p.x + p.width };
            if (!ground.some(g => overlapsX(g, box))) continue; // over a pit: nothing to walk on below
            expect(level.groundY - (p.y + PLATFORM_THICKNESS), `platform at x=${p.x}`).toBeGreaterThanOrEqual(HEADROOM);
        }
    });

    it('every surface, including the dog house, can be reached from the spawn', () => {
        const reachable = reachableSurfaceIds(level, PHYSICS);
        const unreachable = surfacesOf(level).filter(s => !reachable.has(s.id)).map(s => s.id);
        expect(unreachable).toEqual([]);
        const goal = goalSurface(level);
        expect(goal).toBeDefined();
        expect(reachable.has(goal!.id)).toBe(true);
    });

    it('the reachability check really catches an impossible level', () => {
        const brokenLevel: Level = { ...level, ground: [[0, 1000], [2000, 3200]], platforms: [] };
        expect(reachableSurfaceIds(brokenLevel, PHYSICS).has(goalSurface(brokenLevel)!.id)).toBe(false);
    });
});
