// Reads a level made in Tiled (JSON map, .tmj) into what game logic and tests need. Pure: no Phaser, so the
// same code validates every map in the tests. Phaser renders the tile layers and handles tile collision itself.
// Format reference: https://doc.mapeditor.org/en/stable/reference/json-map-format/
import type { Surface } from './types';

export const TILE_SIZE = 32;

/** Layer names a map must use (see docs/level-design.md) */
export const LAYER = {
    /** Decoration behind the dogs, never solid (flowers, signs) */
    background: 'Background',
    /** Ground, platforms, ledges: tiles with the `collides` property are solid */
    ground: 'Ground',
    /** Points: spawn, goal, checkpoints */
    objects: 'Objects',
} as const;

/** Object classes the game understands (also defined in levels/maltipoo.tiled-project) */
export const OBJECT_TYPES = ['spawn', 'goal', 'checkpoint'] as const;
export type ObjectType = (typeof OBJECT_TYPES)[number];

// ---------- The parts of the Tiled JSON format we use ----------

export interface TiledProperty {
    name: string;
    type: string;
    value: unknown;
}

export interface TiledTileset {
    firstgid: number;
    name: string;
    tilecount?: number;
    tilewidth?: number;
    tileheight?: number;
    image?: string;
    /** Set when the tileset is an external file, which Phaser can't load */
    source?: string;
    tiles?: { id: number; properties?: TiledProperty[] }[];
}

export interface TiledTileLayer {
    type: 'tilelayer';
    name: string;
    width: number;
    height: number;
    data: number[];
}

export interface TiledObject {
    id: number;
    name: string;
    /** The object's class ("type" in the JSON since Tiled 1.10, "class" in 1.9) */
    type?: string;
    class?: string;
    x: number;
    y: number;
}

export interface TiledObjectLayer {
    type: 'objectgroup';
    name: string;
    objects: TiledObject[];
}

export interface TiledMap {
    orientation: string;
    infinite: boolean;
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: Array<TiledTileLayer | TiledObjectLayer | { type: string; name: string }>;
    tilesets: TiledTileset[];
}

// ---------- What the game and tests get ----------

export interface Point {
    x: number;
    y: number;
}

export interface LevelData {
    id: string;
    columns: number;
    rows: number;
    /** World size in px */
    width: number;
    height: number;
    isSolid(column: number, row: number): boolean;
    /** Every standable surface: a horizontal run of solid tiles with free space above */
    surfaces: Surface[];
    /** Feet positions, already dropped onto the ground below where they were placed */
    spawn: Point;
    goal: Point;
    /** Sorted left to right */
    checkpoints: Point[];
}

export class LevelError extends Error {
    constructor(levelId: string, problem: string) {
        super(`${levelId}: ${problem}`);
        this.name = 'LevelError';
    }
}

function isTileLayer(layer: TiledMap['layers'][number]): layer is TiledTileLayer {
    return layer.type === 'tilelayer';
}

function isObjectLayer(layer: TiledMap['layers'][number]): layer is TiledObjectLayer {
    return layer.type === 'objectgroup';
}

/** Global tile ids (gids) whose tile has `collides: true`. Flip flags in the top bits of a gid are ignored. */
function solidGids(map: TiledMap): Set<number> {
    const solid = new Set<number>();
    for (const tileset of map.tilesets) {
        for (const tile of tileset.tiles ?? []) {
            if (tile.properties?.some(p => p.name === 'collides' && p.value === true)) solid.add(tileset.firstgid + tile.id);
        }
    }
    return solid;
}

const GID_MASK = 0x0fffffff; // Tiled stores flip/rotate flags in the 4 highest bits

export function parseTiledMap(id: string, map: TiledMap): LevelData {
    const fail = (problem: string): never => { throw new LevelError(id, problem); };

    if (map.orientation !== 'orthogonal') fail(`orientation must be "orthogonal", not "${map.orientation}"`);
    if (map.infinite) fail('infinite maps are not supported (Map > Map Properties > uncheck Infinite)');
    if (map.tilewidth !== TILE_SIZE || map.tileheight !== TILE_SIZE) fail(`tiles must be ${TILE_SIZE}x${TILE_SIZE}px`);
    for (const tileset of map.tilesets) {
        if (tileset.source) fail(`tileset "${tileset.source}" is external; embed it (Map > Embed Tilesets) so Phaser can load it`);
    }

    const ground = map.layers.find(l => l.name === LAYER.ground);
    if (!ground || !isTileLayer(ground)) return fail(`needs a tile layer named "${LAYER.ground}"`);
    const objectsLayer = map.layers.find(l => l.name === LAYER.objects);
    if (!objectsLayer || !isObjectLayer(objectsLayer)) return fail(`needs an object layer named "${LAYER.objects}"`);

    const columns = map.width;
    const rows = map.height;
    const solid = solidGids(map);
    const isSolid = (column: number, row: number): boolean => {
        if (column < 0 || column >= columns || row < 0 || row >= rows) return false;
        const gid = (ground.data[row * columns + column] ?? 0) & GID_MASK;
        return solid.has(gid);
    };

    // Surfaces: runs of solid tiles in a row with an empty tile above each of them
    const surfaces: Surface[] = [];
    for (let row = 0; row < rows; row++) {
        let start = -1;
        for (let column = 0; column <= columns; column++) {
            const standable = column < columns && isSolid(column, row) && !isSolid(column, row - 1);
            if (standable && start < 0) start = column;
            if (!standable && start >= 0) {
                surfaces.push({ id: `r${row}c${start}`, left: start * TILE_SIZE, right: column * TILE_SIZE, top: row * TILE_SIZE });
                start = -1;
            }
        }
    }

    // Objects are dropped onto the first solid tile below them, so they don't need pixel-exact placement
    const dropToGround = (object: TiledObject): Point => {
        const column = Math.floor(object.x / TILE_SIZE);
        for (let row = Math.max(0, Math.floor(object.y / TILE_SIZE)); row < rows; row++) {
            if (isSolid(column, row)) return { x: object.x, y: row * TILE_SIZE };
        }
        return fail(`${object.type ?? object.class} at x=${Math.round(object.x)} has no ground below it`);
    };

    const byType = new Map<ObjectType, TiledObject[]>(OBJECT_TYPES.map(type => [type, []]));
    for (const object of objectsLayer.objects) {
        const type = object.type || object.class || '';
        if (!(OBJECT_TYPES as readonly string[]).includes(type)) {
            fail(`object #${object.id} has unknown class "${type}" (known: ${OBJECT_TYPES.join(', ')})`);
        }
        byType.get(type as ObjectType)?.push(object);
    }
    const exactlyOne = (type: ObjectType): TiledObject => {
        const found = byType.get(type) ?? [];
        if (found.length !== 1) fail(`needs exactly one "${type}" object, found ${found.length}`);
        return found[0] as TiledObject;
    };

    return {
        id,
        columns,
        rows,
        width: columns * TILE_SIZE,
        height: rows * TILE_SIZE,
        isSolid,
        surfaces,
        spawn: dropToGround(exactlyOne('spawn')),
        goal: dropToGround(exactlyOne('goal')),
        checkpoints: (byType.get('checkpoint') ?? []).map(dropToGround).sort((a, b) => a.x - b.x),
    };
}

/**
 * Free space above a surface tile (px) until the next solid tile, or Infinity if the column is open to the sky.
 * Used by the tests: 3+ tiles = everyone walks under, 2 tiles = ducking only, 1 tile = nobody (a trap).
 */
export function headroomAbove(level: LevelData, column: number, surfaceRow: number): number {
    for (let row = surfaceRow - 1; row >= 0; row--) {
        if (level.isSolid(column, row)) return (surfaceRow - row - 1) * TILE_SIZE;
    }
    return Infinity;
}
