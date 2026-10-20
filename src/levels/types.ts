// Shared level types. Coordinates are world pixels; y grows downwards. Levels themselves are Tiled maps (tiled.ts).

/** Anything the dog can stand on, as a horizontal line segment */
export interface Surface {
    readonly id: string;
    readonly left: number;
    readonly right: number;
    readonly top: number;
}
