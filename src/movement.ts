// Pure movement rules, one small step per frame. No Phaser here: the scene feeds in input and the body's
// current velocity, applies what comes out, and the rules are unit-tested in tests/movement.test.ts.
import type { Physics } from './physics';

export type Direction = -1 | 0 | 1;

// ---------- Running: walk speed that ramps up to a capped run speed ----------

export interface RunState {
    /** Horizontal velocity (px/s) */
    readonly vx: number;
    /** Direction being held, and for how long (s); turning around or letting go resets the ramp */
    readonly heldDirection: Direction;
    readonly heldTime: number;
}

export const RUN_START: RunState = { vx: 0, heldDirection: 0, heldTime: 0 };

/** Speed the dog accelerates toward after holding a direction for `heldTime` seconds. */
export function targetSpeed(heldTime: number, p: Physics): number {
    const ramp = Math.min(1, heldTime / p.rampTime);
    return p.walkSpeed + (p.runSpeed - p.walkSpeed) * ramp;
}

function approach(value: number, target: number, maxStep: number): number {
    if (value < target) return Math.min(target, value + maxStep);
    return Math.max(target, value - maxStep);
}

/** `speedLimit` caps the target speed (e.g. crawling); the ramp still builds up underneath. */
export function stepRun(
    state: RunState, input: Direction, onGround: boolean, dt: number, p: Physics, speedLimit = Infinity,
): RunState {
    if (input === 0) {
        const braking = onGround ? p.groundDeceleration : p.airDeceleration;
        return { vx: approach(state.vx, 0, braking * dt), heldDirection: 0, heldTime: 0 };
    }
    const heldTime = input === state.heldDirection ? state.heldTime + dt : 0;
    const accelerating = onGround ? p.groundAcceleration : p.airAcceleration;
    // Turning around on the ground uses the stronger braking force so it feels responsive
    const turning = Math.sign(state.vx) === -input;
    const rate = turning && onGround ? Math.max(accelerating, p.groundDeceleration) : accelerating;
    return {
        vx: approach(state.vx, input * Math.min(targetSpeed(heldTime, p), speedLimit), rate * dt),
        heldDirection: input,
        heldTime,
    };
}

// ---------- Jumping: coyote time, jump buffer, variable height ----------

export interface JumpState {
    /** Seconds left in which a jump is still allowed after leaving the ground */
    readonly coyote: number;
    /** Seconds left in which an early jump press is remembered */
    readonly buffer: number;
    /** True from take-off until the dog starts falling (or the jump was cut) */
    readonly rising: boolean;
}

export const JUMP_START: JumpState = { coyote: 0, buffer: 0, rising: false };

export interface JumpInput {
    /** Jump went down this frame */
    readonly pressed: boolean;
    /** Jump is being held */
    readonly held: boolean;
    readonly onGround: boolean;
    /** Vertical velocity (px/s, negative = up) */
    readonly vy: number;
}

export interface JumpStep {
    readonly state: JumpState;
    /** Start a jump now: set vy = -jumpVelocity */
    readonly jump: boolean;
    /** Jump released early: multiply vy by jumpCutMultiplier */
    readonly cut: boolean;
}

export function stepJump(state: JumpState, input: JumpInput, dt: number, p: Physics): JumpStep {
    const coyote = input.onGround ? p.coyoteTime : Math.max(0, state.coyote - dt);
    const buffer = input.pressed ? p.jumpBufferTime : Math.max(0, state.buffer - dt);

    if (buffer > 0 && coyote > 0) {
        return { state: { coyote: 0, buffer: 0, rising: true }, jump: true, cut: false };
    }
    const rising = state.rising && input.vy < 0;
    if (rising && !input.held) {
        return { state: { coyote, buffer, rising: false }, jump: false, cut: true };
    }
    return { state: { coyote, buffer, rising }, jump: false, cut: false };
}

// ---------- Ducking (Sofi's skill): lie low to fit under things ----------

export interface CrouchInput {
    /** Duck key (↓/S) is held */
    readonly wantsCrouch: boolean;
    /** This character has the skill */
    readonly canCrouch: boolean;
    readonly onGround: boolean;
    /** Nothing above would block the standing body */
    readonly hasHeadroom: boolean;
}

/**
 * Whether the dog is ducked this frame. Ducking starts only on the ground; letting go stands her up, but not under
 * a low ceiling: she stays down until there is room (so she can't get stuck inside a wall).
 */
export function nextCrouching(crouching: boolean, input: CrouchInput): boolean {
    if (crouching) return input.wantsCrouch || !input.hasHeadroom;
    return input.canCrouch && input.wantsCrouch && input.onGround;
}
