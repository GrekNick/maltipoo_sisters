#!/usr/bin/env node
/**
 * Draws the placeholder tileset used to paint levels in Tiled, until real tiles arrive (roadmap M7.3):
 *
 *   npm run art:tileset
 *
 * Output (commit it): levels/tilesets/placeholder.png, 4 tiles of 32x32 in one row:
 *   0 grass   ground top            (solid)
 *   1 dirt    ground below the top  (solid)
 *   2 plank   wooden ledge / bench  (solid)
 *   3 flower  decoration            (not solid; paint it on the Background layer)
 *
 * Which tiles are solid is a tile property (`collides`) in the tileset embedded in each map, not here.
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';

const TILE = 32;
const OUT = 'levels/tilesets/placeholder.png';
const img = new PNG({ width: TILE * 4, height: TILE });

function rect(tile, x, y, w, h, hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
            const i = (yy * img.width + tile * TILE + xx) * 4;
            img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
        }
    }
}

// Same look as the code-drawn ground in src/scenes/art.ts
function dirt(tile) {
    rect(tile, 0, 0, TILE, TILE, '#8b5a2b');
    for (const [x, y] of [[4, 6], [18, 3], [26, 14], [9, 20], [21, 25], [3, 28], [14, 12]]) rect(tile, x, y, 3, 3, '#6f4520');
}

// 0 grass: dirt with a grass strip on top
dirt(0);
rect(0, 0, 0, TILE, 8, '#4caf50');
rect(0, 5, 8, 4, 3, '#4caf50');
rect(0, 19, 8, 5, 2, '#4caf50');
rect(0, 0, 0, TILE, 3, '#7ed957');

// 1 dirt
dirt(1);

// 2 plank: a wooden board with grain lines and a dark outline
rect(2, 0, 0, TILE, TILE, '#5d3a1a');
rect(2, 0, 2, TILE, TILE - 4, '#c08a50');
rect(2, 0, 2, TILE, 2, '#d9a066');
rect(2, 0, 11, TILE, 1, '#9a6a37');
rect(2, 0, 21, TILE, 1, '#9a6a37');
rect(2, 15, 2, 1, TILE - 4, '#7a4f26');
for (const x of [4, 26]) { rect(2, x, 6, 2, 2, '#5d3a1a'); rect(2, x, 24, 2, 2, '#5d3a1a'); }

// 3 flower: stem, two leaves, pink petals around a yellow centre (transparent background)
rect(3, 15, 18, 2, 14, '#3e8e41');
rect(3, 10, 24, 5, 3, '#4caf50');
rect(3, 17, 21, 5, 3, '#4caf50');
for (const [x, y] of [[13, 8], [17, 8], [11, 12], [19, 12], [13, 16], [17, 16]]) rect(3, x, y, 4, 4, '#f48fb1');
rect(3, 14, 11, 6, 6, '#ec407a');
rect(3, 15, 12, 4, 4, '#ffe082');

fs.mkdirSync('levels/tilesets', { recursive: true });
fs.writeFileSync(OUT, PNG.sync.write(img));
console.log(`tileset: ${OUT} (${img.width}x${img.height}, 4 tiles of ${TILE}px)`);
