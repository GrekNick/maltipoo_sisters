// Pure jump math + a "can the level be finished?" check. No Phaser here, so it runs in unit tests.
import type { Physics } from '../physics';
import type { Surface } from './types';

export function maxJumpHeight({ gravity, jumpVelocity }: Physics): number {
    return (jumpVelocity * jumpVelocity) / (2 * gravity);
}

/**
 * Horizontal distance a full jump covers before landing `rise` px above the take-off height (negative rise =
 * landing lower). Returns null if the height can't be reached at all.
 *
 * Uses walking speed, not the ramped-up run speed: levels must be finishable without a running start.
 * Rising uses `gravity`, falling the stronger `fallGravity`. The fall-speed cap is ignored, which only
 * underestimates air time, so the check stays on the safe side.
 */
export function jumpDistance(rise: number, physics: Physics): number | null {
    const { gravity, fallGravity, jumpVelocity, walkSpeed } = physics;
    const apex = maxJumpHeight(physics);
    if (rise > apex) return null;
    const timeUp = jumpVelocity / gravity;
    const timeDown = Math.sqrt((2 * (apex - rise)) / fallGravity);
    return walkSpeed * (timeUp + timeDown);
}

/** The surface a point (feet position) stands on, if any. */
export function surfaceAt(surfaces: readonly Surface[], point: { x: number; y: number }): Surface | undefined {
    return surfaces.find(s => s.top === point.y && point.x >= s.left && point.x <= s.right);
}

/**
 * Can you get from surface `a` onto surface `b` with one jump (or by walking off and falling)?
 * `safety` < 1 keeps a margin so the level isn't only beatable with pixel-perfect jumps.
 */
export function canReach(a: Surface, b: Surface, physics: Physics, safety = 0.85): boolean {
    const gap = Math.max(0, b.left - a.right, a.left - b.right);
    const rise = a.top - b.top; // screen y grows downwards
    if (rise > maxJumpHeight(physics) * safety) return false;
    const distance = jumpDistance(rise, physics);
    return distance !== null && gap <= distance * safety;
}

/**
 * Ids of all surfaces reachable from the surface under `start` (breadth-first search over jumps).
 *
 * `moves` is one sister's physics, or several: the player can swap sisters anywhere, so a step counts if any of them
 * can make it (Kiwi's big jump up a ledge, then Sofi again). Ducking needs no rule here: a duck gap is part of the
 * surface it's on, and the headroom check makes sure such gaps are exactly Sofi-sized. Like the single-sister check,
 * ceilings above a jump are not modelled.
 */
export function reachableFrom(
    surfaces: readonly Surface[], start: { x: number; y: number }, moves: Physics | readonly Physics[], safety?: number,
): Set<string> {
    const sisters: readonly Physics[] = Array.isArray(moves) ? moves : [moves as Physics];
    const first = surfaceAt(surfaces, start);
    if (!first) return new Set();
    const seen = new Set([first.id]);
    const queue = [first];
    for (let from = queue.shift(); from; from = queue.shift()) {
        for (const to of surfaces) {
            if (!seen.has(to.id) && sisters.some(physics => canReach(from, to, physics, safety))) {
                seen.add(to.id);
                queue.push(to);
            }
        }
    }
    return seen;
}
