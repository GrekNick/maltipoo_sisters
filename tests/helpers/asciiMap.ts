// Builds a small Tiled map from ASCII art for tests: one character per 32px tile.
//   #  ground (solid)    =  plank (solid)    *  flower (not solid)    .  empty
// Objects are given by class and tile position; they are placed in the middle of that tile.
import type { TiledMap, TiledObject } from '../../src/levels/tiled';

const GIDS: Record<string, number> = { '.': 0, '#': 1, '=': 3, '*': 4 };

export interface AsciiObject {
    type: string;
    column: number;
    row: number;
}

export function asciiMap(rows: string[], objects: AsciiObject[] = []): TiledMap {
    const width = rows[0]?.length ?? 0;
    const data = rows.flatMap(row => [...row].map(ch => GIDS[ch] ?? 0));
    const tiledObjects: TiledObject[] = objects.map((o, i) => ({
        id: i + 1, name: '', type: o.type, x: o.column * 32 + 16, y: o.row * 32 + 16,
    }));
    return {
        orientation: 'orthogonal',
        infinite: false,
        width,
        height: rows.length,
        tilewidth: 32,
        tileheight: 32,
        tilesets: [{
            firstgid: 1,
            name: 'placeholder',
            tilecount: 4,
            tiles: [0, 1, 2].map(id => ({ id, properties: [{ name: 'collides', type: 'bool', value: true }] })),
        }],
        layers: [
            { type: 'tilelayer', name: 'Ground', width, height: rows.length, data },
            { type: 'objectgroup', name: 'Objects', objects: tiledObjects },
        ],
    };
}
