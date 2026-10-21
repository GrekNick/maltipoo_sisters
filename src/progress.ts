// The player's progress through the levels, as pure data and rules (no storage; src/persistence.ts saves it).
// Levels unlock in order: the first is always open, every other one once the level before it is finished.
// The level map (roadmap M3.3) shows this; levels are identified by their id (= the map key, e.g. "level1").

/** Kept per level once it has been finished */
export interface LevelRecord {
    /** Fastest finish (s) */
    readonly bestSeconds: number;
    /** Most treats collected in one run */
    readonly bestTreats: number;
}

/** Finished levels by id. A level that isn't listed hasn't been finished yet. */
export type Progress = Readonly<Record<string, LevelRecord>>;

export const NO_PROGRESS: Progress = {};

export interface BestTime {
    readonly seconds: number;
    /** This run beat an earlier best time (never on the very first finish, when there was nothing to beat) */
    readonly isNew: boolean;
}

export interface BestTreats {
    readonly count: number;
    /** This run collected more than any earlier one (never on the very first finish) */
    readonly isNew: boolean;
}

export interface FinishResult {
    readonly progress: Progress;
    readonly best: BestTime;
    readonly treats: BestTreats;
}

/** Adds a finished run: keeps the better time and the higher treat count. */
export function recordFinish(progress: Progress, levelId: string, seconds: number, treats: number): FinishResult {
    const previous = progress[levelId];
    const bestSeconds = previous ? Math.min(previous.bestSeconds, seconds) : seconds;
    const bestTreats = previous ? Math.max(previous.bestTreats, treats) : treats;
    return {
        progress: { ...progress, [levelId]: { bestSeconds, bestTreats } },
        best: { seconds: bestSeconds, isNew: previous !== undefined && seconds < previous.bestSeconds },
        treats: { count: bestTreats, isNew: previous !== undefined && treats > previous.bestTreats },
    };
}

/** `levelIds` in play order. Unknown ids are locked. */
export function isUnlocked(levelIds: readonly string[], progress: Progress, levelId: string): boolean {
    const index = levelIds.indexOf(levelId);
    if (index < 0) return false;
    const before = levelIds[index - 1];
    return before === undefined || progress[before] !== undefined;
}

/** Where "Continue" goes: the first unlocked level not finished yet, or the last level once everything is done. */
export function continueLevel(levelIds: readonly string[], progress: Progress): string | undefined {
    return levelIds.find(id => progress[id] === undefined) ?? levelIds[levelIds.length - 1];
}

/** Validates saved data: keeps entries with sane numbers, drops anything else. */
export function parseProgress(value: unknown): Progress {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return NO_PROGRESS;
    const progress: Record<string, LevelRecord> = {};
    for (const [id, entry] of Object.entries(value)) {
        if (typeof entry !== 'object' || entry === null) continue;
        const { bestSeconds, bestTreats } = entry as Record<string, unknown>;
        if (typeof bestSeconds !== 'number' || !(bestSeconds > 0) || !Number.isFinite(bestSeconds)) continue;
        const treats = typeof bestTreats === 'number' && Number.isInteger(bestTreats) && bestTreats >= 0 ? bestTreats : 0;
        progress[id] = { bestSeconds, bestTreats: treats };
    }
    return progress;
}
