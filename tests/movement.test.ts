import { describe, it, expect } from 'vitest';
import { PHYSICS } from '../src/physics';
import { RUN_START, JUMP_START, stepRun, stepJump, targetSpeed, type RunState, type JumpState, type Direction } from '../src/movement';

const DT = 1 / 60;

/** Run the rules for `seconds` holding `input` and return the final state. */
function holdRun(seconds: number, input: Direction, start: RunState = RUN_START, onGround = true): RunState {
    let state = start;
    for (let t = 0; t < seconds; t += DT) state = stepRun(state, input, onGround, DT, PHYSICS);
    return state;
}

describe('running', () => {
    it('reaches walking speed quickly (well under a quarter second)', () => {
        expect(holdRun(0.2, 1).vx).toBeGreaterThanOrEqual(PHYSICS.walkSpeed);
    });

    it('keeps speeding up while a direction is held, up to the run speed cap', () => {
        const half = holdRun(PHYSICS.rampTime / 2, 1).vx;
        const full = holdRun(PHYSICS.rampTime + 0.5, 1).vx;
        expect(half).toBeGreaterThan(PHYSICS.walkSpeed);
        expect(half).toBeLessThan(PHYSICS.runSpeed);
        expect(full).toBeCloseTo(PHYSICS.runSpeed, 6);
        expect(holdRun(10, 1).vx).toBeCloseTo(PHYSICS.runSpeed, 6); // never above the cap
    });

    it('target speed ramps linearly from walk to run', () => {
        expect(targetSpeed(0, PHYSICS)).toBe(PHYSICS.walkSpeed);
        expect(targetSpeed(PHYSICS.rampTime, PHYSICS)).toBe(PHYSICS.runSpeed);
        expect(targetSpeed(PHYSICS.rampTime * 5, PHYSICS)).toBe(PHYSICS.runSpeed);
    });

    it('turning around resets the ramp', () => {
        const fast = holdRun(2, 1);
        const turned = stepRun(fast, -1, true, DT, PHYSICS);
        expect(turned.heldTime).toBe(0);
        expect(holdRun(1, -1, fast).vx).toBeCloseTo(-PHYSICS.walkSpeed - (PHYSICS.runSpeed - PHYSICS.walkSpeed) * (1 - DT / PHYSICS.rampTime), 0);
    });

    it('letting go brakes to a stop on the ground, and drifts longer in the air', () => {
        const fast = holdRun(2, 1);
        const groundStop = holdRun(0.2, 0, fast, true).vx;
        const airDrift = holdRun(0.2, 0, fast, false).vx;
        expect(groundStop).toBe(0);
        expect(airDrift).toBeGreaterThan(0);
    });
});

describe('jumping', () => {
    const onGround = { pressed: false, held: false, onGround: true, vy: 0 };
    const inAir = { pressed: false, held: false, onGround: false, vy: 100 };

    it('jumps when pressed on the ground', () => {
        expect(stepJump(JUMP_START, { ...onGround, pressed: true }, DT, PHYSICS).jump).toBe(true);
    });

    it('coyote time: still jumps shortly after walking off a ledge, not later', () => {
        let state: JumpState = stepJump(JUMP_START, onGround, DT, PHYSICS).state;
        state = stepJump(state, inAir, 0.05, PHYSICS).state; // 50ms after leaving the ledge
        expect(stepJump(state, { ...inAir, pressed: true }, DT, PHYSICS).jump).toBe(true);

        let late: JumpState = stepJump(JUMP_START, onGround, DT, PHYSICS).state;
        late = stepJump(late, inAir, PHYSICS.coyoteTime + 0.05, PHYSICS).state;
        expect(stepJump(late, { ...inAir, pressed: true }, DT, PHYSICS).jump).toBe(false);
    });

    it('jump buffer: a press just before landing jumps on landing', () => {
        const pressedInAir = stepJump(JUMP_START, { ...inAir, pressed: true }, DT, PHYSICS);
        expect(pressedInAir.jump).toBe(false);
        const landed = stepJump(pressedInAir.state, onGround, 0.05, PHYSICS);
        expect(landed.jump).toBe(true);
    });

    it('an old press is forgotten', () => {
        const pressedInAir = stepJump(JUMP_START, { ...inAir, pressed: true }, DT, PHYSICS).state;
        const stale = stepJump(pressedInAir, inAir, PHYSICS.jumpBufferTime + 0.05, PHYSICS).state;
        expect(stepJump(stale, onGround, DT, PHYSICS).jump).toBe(false);
    });

    it('releasing jump while rising cuts the jump once (short hop)', () => {
        const takeOff = stepJump(JUMP_START, { ...onGround, pressed: true, held: true }, DT, PHYSICS).state;
        const released = stepJump(takeOff, { pressed: false, held: false, onGround: false, vy: -500 }, DT, PHYSICS);
        expect(released.cut).toBe(true);
        expect(stepJump(released.state, { pressed: false, held: false, onGround: false, vy: -200 }, DT, PHYSICS).cut).toBe(false);
    });

    it('holding jump does not cut it, and nothing is cut once falling', () => {
        const takeOff = stepJump(JUMP_START, { ...onGround, pressed: true, held: true }, DT, PHYSICS).state;
        expect(stepJump(takeOff, { pressed: false, held: true, onGround: false, vy: -500 }, DT, PHYSICS).cut).toBe(false);
        expect(stepJump(takeOff, { pressed: false, held: false, onGround: false, vy: 50 }, DT, PHYSICS).cut).toBe(false);
    });
});
