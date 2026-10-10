// Shape of hand-written level data. Coordinates are world pixels; y grows downwards.

export interface Platform {
    /** Left edge */
    readonly x: number;
    /** Top edge (the surface the dog stands on) */
    readonly y: number;
    readonly width: number;
}

export interface Level {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    /** Top of the ground; the ground fills down to the bottom of the world */
    readonly groundY: number;
    /** Ground segments as [fromX, toX]; the holes between them are pits */
    readonly ground: ReadonlyArray<readonly [from: number, to: number]>;
    readonly platforms: readonly Platform[];
    /** Where the dog's feet start */
    readonly spawn: { readonly x: number; readonly y: number };
    /** Dog house center; it stands on the ground */
    readonly goal: { readonly x: number };
}

/** Anything the dog can stand on, as a horizontal line segment */
export interface Surface {
    readonly id: string;
    readonly left: number;
    readonly right: number;
    readonly top: number;
}
