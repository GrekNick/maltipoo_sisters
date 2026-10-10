import { describe, it, expect } from 'vitest';
import { maxJumpHeight, jumpDistance, canReach } from '../src/levels/reachability';
import { PHYSICS } from '../src/physics';
import type { Surface } from '../src/levels/types';

const surface = (left: number, right: number, top: number): Surface => ({ id: `${left},${top}`, left, right, top });
const distance = (rise: number) => jumpDistance(rise, PHYSICS) ?? Number.NaN;

describe('jump physics', () => {
    it('max jump height is v²/2g', () => {
        // 530² / (2·700) ≈ 200.6px
        expect(maxJumpHeight(PHYSICS)).toBeCloseTo(200.64, 1);
    });

    it('a jump that lands at the same height covers runSpeed · 2v/g', () => {
        // 160 · 2·530/700 ≈ 242px
        expect(jumpDistance(0, PHYSICS)).toBeCloseTo(242.3, 1);
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
