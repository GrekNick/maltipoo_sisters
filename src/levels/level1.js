// Stopgap hand-written level data; it will be replaced by a Tiled map (see docs/decisions.md).
// Every coordinate is in world pixels. Surfaces are rectangles given by their top-left corner.
export const level1 = {
    width: 3200,  // 4 screens wide
    height: 600,
    groundY: 552, // top of the ground; the ground fills down to the bottom of the world

    // Ground segments as [fromX, toX]; the holes between them are pits you can fall into.
    ground: [
        [0, 1000],
        [1130, 1900],
        [2160, 3200],
    ],

    // Floating platforms (32px thick)
    platforms: [
        // Screen 1: warm-up steps
        { x: 330, y: 440, width: 160 },
        { x: 560, y: 350, width: 160 },
        // Screen 2: staircase after the first pit
        { x: 1240, y: 440, width: 128 },
        { x: 1420, y: 370, width: 128 },
        { x: 1600, y: 280, width: 192 },
        // Screen 3: stepping stone over the wide pit, then an optional high route
        { x: 1985, y: 470, width: 96 },
        { x: 2250, y: 440, width: 160 },
        { x: 2450, y: 360, width: 160 },
        { x: 2650, y: 270, width: 160 },
        // Screen 4: one more step before home
        { x: 2820, y: 440, width: 120 },
    ],

    spawn: { x: 100, y: 552 }, // where the dog's feet start
    goal: { x: 3060 },         // dog house center; it stands on the ground
};
