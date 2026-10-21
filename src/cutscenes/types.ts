// What a cutscene script is made of (design: docs/cutscenes.md). Scripts are typed data in src/cutscenes/*.ts, so
// the editor autocompletes actors, backdrops, panels and text keys, and a typo is a compile error.
import type { ActorKey, CharacterKey } from '../characters';
import type { MessageKey } from '../i18n';

/** Who can be on stage: the sisters and the cutscene actors (Smok Junior) */
export type ActorId = CharacterKey | ActorKey;

/** Scenery behind the actors; drawn in code until the painted backdrops (roadmap 7.4) */
export type BackdropId = 'salt-mine' | 'meadow';

/** Full-screen illustrations for the big moments; shown as a caption card until the image exists */
export type PanelId = 'red-stone-glow';

export type Facing = 'left' | 'right';

export type Beat =
    /** Speech bubble over the actor; the text types in. Waits for a tap. */
    | { readonly say: ActorId; readonly line: MessageKey }
    /** Walks (or runs) along the floor to x, facing the way they go. Continues by itself. */
    | { readonly move: ActorId; readonly to: number; readonly speed?: 'walk' | 'run' }
    /** Turns around. Continues by itself. */
    | { readonly face: ActorId; readonly dir: Facing }
    /** Full-screen picture with an optional caption. Waits for a tap. */
    | { readonly panel: PanelId; readonly line?: MessageKey }
    /** A short pause (ms). Continues by itself; a tap skips it. */
    | { readonly wait: number }
    /** Several beats at once (e.g. both sisters walking); done when all are */
    | { readonly together: readonly Beat[] };

export interface StageActor {
    /** Starting x on the floor line (0–800; outside = off stage) */
    readonly x: number;
    /** Sprites face right; turn the ones on the right to face the others */
    readonly face?: Facing;
}

export interface Cutscene {
    readonly id: string;
    readonly backdrop: BackdropId;
    readonly actors: Readonly<Partial<Record<ActorId, StageActor>>>;
    readonly beats: readonly Beat[];
}

/** Every text line a script uses, in order (bubbles and captions, including inside `together`) */
export function linesOf(beats: readonly Beat[]): MessageKey[] {
    return beats.flatMap(beat => {
        if ('together' in beat) return linesOf(beat.together);
        if ('say' in beat) return [beat.line];
        if ('panel' in beat && beat.line) return [beat.line];
        return [];
    });
}

/** Every actor a script makes speak, move or turn */
export function actorsOf(beats: readonly Beat[]): ActorId[] {
    return beats.flatMap(beat => {
        if ('together' in beat) return actorsOf(beat.together);
        if ('say' in beat) return [beat.say];
        if ('move' in beat) return [beat.move];
        if ('face' in beat) return [beat.face];
        return [];
    });
}
