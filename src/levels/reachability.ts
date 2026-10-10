// Pure jump math + a "can the level be finished?" check. No Phaser here, so it runs in unit tests.
import type { Physics } from '../physics';
import type { Level, Surface } from './types';

export function maxJumpHeight({ gravity, jumpVelocity }: Physics): number {
    return (jumpVelocity * jumpVelocity) / (2 * gravity);
}

/**
 * Horizontal distance a full-speed jump covers before landing `rise` px above the take-off height
 * (negative rise = landing lower). Returns null if the height can't be reached at all.
 */
export function jumpDistance(rise: number, physics: Physics): number | null {
    const { gravity, jumpVelocity, runSpeed } = physics;
    if (rise > maxJumpHeight(physics)) return null;
    // y(t) = v·t − g·t²/2 = rise  →  take the later root (landing while falling)
    const t = (jumpVelocity + Math.sqrt(jumpVelocity * jumpVelocity - 2 * gravity * rise)) / gravity;
    return runSpeed * t;
}

/** Every standable surface of a level. */
export function surfacesOf(level: Level): Surface[] {
    const ground = level.ground.map(([from, to], i) => ({ id: `ground${i}`, left: from, right: to, top: level.groundY }));
    const platforms = level.platforms.map((p, i) => ({ id: `platform${i}`, left: p.x, right: p.x + p.width, top: p.y }));
    return [...ground, ...platforms];
}

function surfaceUnder(surfaces: readonly Surface[], x: number, y: number): Surface | undefined {
    return surfaces.find(s => s.top === y && x >= s.left && x <= s.right);
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

/** Ids of all surfaces reachable from the spawn point (breadth-first search). */
export function reachableSurfaceIds(level: Level, physics: Physics, safety?: number): Set<string> {
    const surfaces = surfacesOf(level);
    const start = surfaceUnder(surfaces, level.spawn.x, level.spawn.y);
    if (!start) return new Set();
    const seen = new Set([start.id]);
    const queue = [start];
    for (let from = queue.shift(); from; from = queue.shift()) {
        for (const to of surfaces) {
            if (!seen.has(to.id) && canReach(from, to, physics, safety)) {
                seen.add(to.id);
                queue.push(to);
            }
        }
    }
    return seen;
}

export function goalSurface(level: Level): Surface | undefined {
    return surfaceUnder(surfacesOf(level), level.goal.x, level.groundY);
}
