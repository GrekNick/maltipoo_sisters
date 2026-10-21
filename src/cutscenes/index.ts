// All cutscenes by id. A scene plays when its hook comes (docs/cutscenes.md): a place's `arrival` on the map
// (src/levels/route.ts; the first place's arrival is the intro), and later the ending.
import { intro } from './intro';
import type { Cutscene } from './types';

export const CUTSCENES = { intro } as const satisfies Record<string, Cutscene>;

export type CutsceneId = keyof typeof CUTSCENES;

export function isCutsceneId(value: unknown): value is CutsceneId {
    return typeof value === 'string' && Object.hasOwn(CUTSCENES, value);
}
