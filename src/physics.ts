// All movement tuning (px, px/s, px/s², seconds). The game reads these, and so do the level reachability
// tests, so changing a number here automatically re-checks that every level can still be finished.
export interface Physics {
    /** Speed right after you start moving */
    readonly walkSpeed: number;
    /** Top speed, reached after holding one direction for `rampTime` */
    readonly runSpeed: number;
    readonly rampTime: number;
    /** How quickly the dog reaches its target speed (px/s²) on the ground and in the air */
    readonly groundAcceleration: number;
    readonly airAcceleration: number;
    /** Braking when no direction is held (px/s²) */
    readonly groundDeceleration: number;
    readonly airDeceleration: number;
    /** Gravity while rising. Falling uses the stronger `fallGravity`, which is what makes jumps feel less floaty */
    readonly gravity: number;
    readonly fallGravity: number;
    readonly maxFallSpeed: number;
    readonly jumpVelocity: number;
    /** Releasing jump while still rising multiplies the upward speed by this: tap = hop, hold = full jump */
    readonly jumpCutMultiplier: number;
    /** "Coyote time": you can still jump this long after walking off a ledge */
    readonly coyoteTime: number;
    /** A jump pressed this long before landing still happens on landing */
    readonly jumpBufferTime: number;
    /** Top speed while ducked (Sofi crawling) */
    readonly crawlSpeed: number;
}

export const PHYSICS: Physics = {
    walkSpeed: 170,
    runSpeed: 280,
    rampTime: 1.0,
    groundAcceleration: 1600,
    airAcceleration: 1000,
    groundDeceleration: 2200,
    airDeceleration: 600,
    // Same ~200px max jump height as before (v²/2g), but ~1.0s in the air instead of ~1.5s
    gravity: 1300,
    fallGravity: 2000,
    maxFallSpeed: 900,
    jumpVelocity: 720,
    jumpCutMultiplier: 0.45,
    coyoteTime: 0.1,
    jumpBufferTime: 0.12,
    crawlSpeed: 110,
};
