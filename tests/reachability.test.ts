import { describe, it, expect } from 'vitest';
import { maxJumpHeight, jumpDistance, canReach } from '../src/levels/reachability';
import { PHYSICS } from '../src/physics';
import type { Surface } from '../src/levels/types';

const surface = (left: number, right: number, top: number): Surface => ({ id: `${left},${top}`, left, right, top });
const distance = (rise: number) => jumpDistance(rise, PHYSICS) ?? Number.NaN;

describe('jump physics', () => {
    it('max jump height is v²/2g (rising gravity)', () => {
        const { jumpVelocity: v, gravity: g } = PHYSICS;
        expect(maxJumpHeight(PHYSICS)).toBeCloseTo((v * v) / (2 * g), 6);
        expect(maxJumpHeight(PHYSICS)).toBeGreaterThan(180); // level 1's platform spacing assumes ~200px
    });

    it('a same-height jump = walk speed × (time up at gravity + time down at fallGravity)', () => {
        const { jumpVelocity: v, gravity: g, fallGravity: gf, walkSpeed } = PHYSICS;
        const apex = (v * v) / (2 * g);
        expect(jumpDistance(0, PHYSICS)).toBeCloseTo(walkSpeed * (v / g + Math.sqrt((2 * apex) / gf)), 6);
    });

    it('falling faster than rising shortens the jump (less floaty)', () => {
        const symmetric = { ...PHYSICS, fallGravity: PHYSICS.gravity };
        expect(distance(0)).toBeLessThan(jumpDistance(0, symmetric) ?? 0);
    });

    it('landing lower covers more distance than landing higher', () => {
        expect(distance(-100)).toBeGreaterThan(distance(0));
        expect(distance(100)).toBeLessThan(distance(0));
    });

    it('heights above the max jump are unreachable', () => {
        expect(jumpDistance(maxJumpHeight(PHYSICS) + 1, PHYSICS)).toBeNull();
    });
});

describe('canReach', () => {
    const floor = surface(0, 100, 500);

    it('reaches a nearby platform a little higher', () => {
        expect(canReach(floor, surface(150, 250, 420), PHYSICS)).toBe(true);
    });

    it('does not reach a platform that is too high', () => {
        expect(canReach(floor, surface(50, 150, 250), PHYSICS)).toBe(false);
    });

    it('does not reach across a gap that is too wide', () => {
        expect(canReach(floor, surface(400, 500, 500), PHYSICS)).toBe(false);
    });

    it('can always drop down onto something directly below', () => {
        expect(canReach(surface(0, 100, 200), floor, PHYSICS)).toBe(true);
    });
});
