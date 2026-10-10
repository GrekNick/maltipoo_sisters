// Movement tuning shared by the game and the level reachability checks (px, px/s, px/s²).
export interface Physics {
    readonly gravity: number;
    readonly runSpeed: number;
    readonly jumpVelocity: number;
}

export const PHYSICS: Physics = {
    gravity: 700,
    runSpeed: 160,
    jumpVelocity: 530,
};
