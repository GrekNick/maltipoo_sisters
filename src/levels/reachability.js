// Pure jump math + a "can the level be finished?" check. No Phaser here, so it runs in unit tests.

export function maxJumpHeight({ gravity, jumpVelocity }) {
    return (jumpVelocity * jumpVelocity) / (2 * gravity);
}

/**
 * Horizontal distance a full-speed jump covers before landing `rise` px above the take-off height
 * (negative rise = landing lower). Returns null if the height can't be reached at all.
 */
export function jumpDistance(rise, { gravity, jumpVelocity, runSpeed }) {
    if (rise > maxJumpHeight({ gravity, jumpVelocity })) return null;
    // y(t) = v·t − g·t²/2 = rise  →  take the later root (landing while falling)
    const t = (jumpVelocity + Math.sqrt(jumpVelocity * jumpVelocity - 2 * gravity * rise)) / gravity;
    return runSpeed * t;
}

/** Every standable surface of a level as { id, left, right, top }. */
export function surfacesOf(level) {
    const ground = level.ground.map(([from, to], i) => ({ id: `ground${i}`, left: from, right: to, top: level.groundY }));
    const platforms = level.platforms.map((p, i) => ({ id: `platform${i}`, left: p.x, right: p.x + p.width, top: p.y }));
    return [...ground, ...platforms];
}

function surfaceUnder(surfaces, x, y) {
    return surfaces.find(s => s.top === y && x >= s.left && x <= s.right);
}

/**
 * Can you get from surface `a` onto surface `b` with one jump (or by walking off and falling)?
 * `safety` < 1 keeps a margin so the level isn't only beatable with pixel-perfect jumps.
 */
export function canReach(a, b, physics, safety = 0.85) {
    const gap = Math.max(0, b.left - a.right, a.left - b.right);
    const rise = a.top - b.top; // screen y grows downwards
    if (rise > maxJumpHeight(physics) * safety) return false;
    return gap <= jumpDistance(rise, physics) * safety;
}

/** Ids of all surfaces reachable from the spawn point (breadth-first search). */
export function reachableSurfaceIds(level, physics, safety) {
    const surfaces = surfacesOf(level);
    const start = surfaceUnder(surfaces, level.spawn.x, level.spawn.y);
    if (!start) return new Set();
    const seen = new Set([start.id]);
    const queue = [start];
    while (queue.length) {
        const from = queue.shift();
        for (const to of surfaces) {
            if (!seen.has(to.id) && canReach(from, to, physics, safety)) {
                seen.add(to.id);
                queue.push(to);
            }
        }
    }
    return seen;
}

export function goalSurface(level) {
    return surfaceUnder(surfacesOf(level), level.goal.x, level.groundY);
}
