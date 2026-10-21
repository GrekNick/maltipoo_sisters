// The route through Kraków (docs/story-and-levels.md): the places on the level map, in story order, and which
// levels each one has. Levels unlock in this order (src/progress.ts). A place without levels yet shows as
// "coming soon". Pure data and rules, so the map scene stays thin and the rules are tested (tests/route.test.ts).
import type { CutsceneId } from '../cutscenes';
import type { MessageKey } from '../i18n';
import { continueLevel, isUnlocked, type Progress } from '../progress';

export interface Location {
    readonly id: string;
    /** Translated name (place names differ a little per language: Vistula / Вісла / Wisła) */
    readonly name: MessageKey;
    /** Position of its marker on the 800x600 map */
    readonly at: { readonly x: number; readonly y: number };
    /** Level ids (= keys in src/levels/index.ts), in play order */
    readonly levels: readonly string[];
    /** Cutscene that plays the first time the sisters arrive here on the map (docs/cutscenes.md) */
    readonly arrival?: CutsceneId;
}

export const ROUTE: readonly Location[] = [
    // Level 1 is the prototype meadow until the salt mine level is built (roadmap 6.4)
    // The first place's arrival is the story's intro, so it plays before the very first level
    { id: 'wieliczka', name: 'map.wieliczka', at: { x: 690, y: 455 }, levels: ['level1'], arrival: 'intro' },
    { id: 'podgorze', name: 'map.podgorze', at: { x: 500, y: 430 }, levels: [] },
    { id: 'kazimierz', name: 'map.kazimierz', at: { x: 450, y: 270 }, levels: [] },
    { id: 'rynek', name: 'map.rynek', at: { x: 330, y: 150 }, levels: [] },
    { id: 'wawel', name: 'map.wawel', at: { x: 190, y: 270 }, levels: [] },
];

/** Every level on the route, in unlock order */
export function routeLevels(route: readonly Location[] = ROUTE): string[] {
    return route.flatMap(location => location.levels);
}

/**
 * soon: no levels yet · locked: the level before isn't finished · open: playable · done: all its levels finished
 */
export type LocationStatus = 'soon' | 'locked' | 'open' | 'done';

export function locationStatus(location: Location, progress: Progress, route: readonly Location[] = ROUTE): LocationStatus {
    const [first] = location.levels;
    if (first === undefined) return 'soon';
    if (!isUnlocked(routeLevels(route), progress, first)) return 'locked';
    return location.levels.every(id => progress[id] !== undefined) ? 'done' : 'open';
}

export function isPlayable(status: LocationStatus): boolean {
    return status === 'open' || status === 'done';
}

/** The level a place starts: its first unfinished level, or its last one once all are done. */
export function levelToPlay(location: Location, progress: Progress): string | undefined {
    return location.levels.find(id => progress[id] === undefined) ?? location.levels[location.levels.length - 1];
}

/** Index of the place a level belongs to, or -1 */
export function locationIndexOf(levelId: string, route: readonly Location[] = ROUTE): number {
    return route.findIndex(location => location.levels.includes(levelId));
}

/** The arrival scene to play now: the place can be played, has one, and it hasn't been seen yet. */
export function arrivalToPlay(location: Location, status: LocationStatus, seen: ReadonlySet<string>): CutsceneId | undefined {
    if (!isPlayable(status) || !location.arrival || seen.has(location.arrival)) return undefined;
    return location.arrival;
}

/** Where the map opens: the place of the level to continue with (the first place when nothing is built). */
export function currentLocationIndex(progress: Progress, route: readonly Location[] = ROUTE): number {
    const level = continueLevel(routeLevels(route), progress);
    return Math.max(0, level === undefined ? 0 : locationIndexOf(level, route));
}
