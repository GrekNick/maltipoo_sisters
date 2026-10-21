// All playable levels, in order. A level is a Tiled map in levels/ (see docs/level-design.md); Vite bundles the
// files and gives us their URLs. Adding a level = add the .tmj file + one entry here + its place in route.ts
// (tests check all three, and that both lists have the same order).
import level1Url from '../../levels/level1.tmj?url';
import placeholderTilesUrl from '../../levels/tilesets/placeholder.png';

export interface LevelEntry {
    /** Phaser cache key, and the id used for saved best times */
    key: string;
    name: string;
    url: string;
}

export const LEVELS: readonly LevelEntry[] = [
    { key: 'level1', name: 'Meadow (prototype)', url: level1Url },
];

export interface TilesetEntry {
    /** The tileset's name inside the maps (Tiled: Tileset > Tileset Properties > Name) */
    name: string;
    /** Phaser texture key */
    key: string;
    url: string;
}

export const TILESETS: readonly TilesetEntry[] = [
    { name: 'placeholder', key: 'tiles-placeholder', url: placeholderTilesUrl },
];

export const FIRST_LEVEL = LEVELS[0] as LevelEntry;
