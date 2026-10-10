import { describe, it, expect } from 'vitest';
import { maxJumpHeight, jumpDistance, canReach } from '../src/levels/reachability.js';
import { PHYSICS } from '../src/physics.js';

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
        expect(jumpDistance(-100, PHYSICS)).toBeGreaterThan(jumpDistance(0, PHYSICS));
        expect(jumpDistance(100, PHYSICS)).toBeLessThan(jumpDistance(0, PHYSICS));
    });

    it('heights above the max jump are unreachable', () => {
        expect(jumpDistance(maxJumpHeight(PHYSICS) + 1, PHYSICS)).toBeNull();
    });
});

describe('canReach', () => {
    const floor = { left: 0, right: 100, top: 500 };

    it('reaches a nearby platform a little higher', () => {
        expect(canReach(floor, { left: 150, right: 250, top: 420 }, PHYSICS)).toBe(true);
    });

    it('does not reach a platform that is too high', () => {
        expect(canReach(floor, { left: 50, right: 150, top: 250 }, PHYSICS)).toBe(false);
    });

    it('does not reach across a gap that is too wide', () => {
        expect(canReach(floor, { left: 400, right: 500, top: 500 }, PHYSICS)).toBe(false);
    });

    it('can always drop down onto something directly below', () => {
        expect(canReach({ left: 0, right: 100, top: 200 }, floor, PHYSICS)).toBe(true);
    });
});
