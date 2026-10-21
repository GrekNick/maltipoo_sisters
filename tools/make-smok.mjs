#!/usr/bin/env node
/**
 * Smok Junior's frames as true pixel art, from his AI-generated sheet (art/raw/smok_junior/sheet.png: 3 poses in
 * 2 rows, a lighter and a darker variant, on a flat grey background):
 *
 *   npm run art:smok        (then `npm run build:sprites`)
 *
 * 1. measures the drawn pixel size (the sheet is a clean 4x enlargement) and where the grid starts
 * 2. samples the middle of every drawn pixel -> one image pixel per drawn pixel
 * 3. makes the grey background transparent (flood fill from the edges, so grey inside him stays)
 * 4. splits the poses and keeps the chosen row: standing, talking, and the stretched walk pose
 *
 * Output (commit it): art/raw/smok_pixel/{idle,talk,walk}.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { writePng } from './pixel-art.mjs';

const SOURCE = 'art/raw/smok_junior/sheet.png';
const OUT_DIR = 'art/raw/smok_pixel';
/** Which row of the sheet to use: 0 = lighter charcoal (reads better on dark backdrops), 1 = darker variant */
const ROW = 0;
const POSES = ['idle', 'talk', 'walk'];
/** Colour distance (sum of RGB differences) that still counts as the background, or as the same drawn pixel */
const BACKGROUND_TOLERANCE = 6; // the background is one flat colour; his cream horns are only ~15 away from it
const SAME_COLOR = 12;

const sheet = PNG.sync.read(fs.readFileSync(SOURCE));
const { width: W, height: H, data } = sheet;
const at = (x, y) => (y * W + x) * 4;
const distance = (i, j) => Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]);

/** The most common run length of same-coloured pixels = the size of one drawn pixel; plus where its grid starts. */
function measureGrid(horizontal) {
    const runs = new Map();
    const phases = new Map();
    const [outer, inner] = horizontal ? [H, W] : [W, H];
    for (let a = 0; a < outer; a += 2) {
        let run = 1;
        for (let b = 1; b < inner; b++) {
            const [x, y, px, py] = horizontal ? [b, a, b - 1, a] : [a, b, a, b - 1];
            if (distance(at(x, y), at(px, py)) < SAME_COLOR) { run++; continue; }
            runs.set(run, (runs.get(run) ?? 0) + 1);
            phases.set(b, (phases.get(b) ?? 0) + 1); // b = where a new drawn pixel starts
            run = 1;
        }
    }
    const size = [...runs.entries()].filter(([r]) => r > 1).sort((p, q) => q[1] - p[1])[0][0];
    const byPhase = new Map();
    for (const [b, n] of phases) byPhase.set(b % size, (byPhase.get(b % size) ?? 0) + n);
    const phase = [...byPhase.entries()].sort((p, q) => q[1] - p[1])[0][0];
    return { size, phase };
}

const gx = measureGrid(true);
const gy = measureGrid(false);
if (gx.size !== gy.size) throw new Error(`pixel size differs: ${gx.size} across, ${gy.size} down`);
const size = gx.size;

// 1 image pixel per drawn pixel: sample the middle of each block
const w = Math.floor((W - gx.phase) / size);
const h = Math.floor((H - gy.phase) / size);
const small = new PNG({ width: w, height: h });
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        const i = at(gx.phase + x * size + (size >> 1), gy.phase + y * size + (size >> 1));
        const j = (y * w + x) * 4;
        for (let k = 0; k < 4; k++) small.data[j + k] = data[i + k];
    }
}

// Background -> transparent, flooding in from the edges
const background = small.data.subarray(0, 3);
const isBackground = (x, y) => {
    const i = (y * w + x) * 4;
    return Math.abs(small.data[i] - background[0]) + Math.abs(small.data[i + 1] - background[1])
        + Math.abs(small.data[i + 2] - background[2]) < BACKGROUND_TOLERANCE;
};
const stack = [];
for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
const cleared = new Uint8Array(w * h);
while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h || cleared[y * w + x] || !isBackground(x, y)) continue;
    cleared[y * w + x] = 1;
    small.data[(y * w + x) * 4 + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

// The poses: connected areas of opaque pixels (8-connected, so a thin outline corner doesn't split one)
const label = new Int32Array(w * h).fill(-1);
const poses = [];
for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
        if (cleared[y * w + x] || label[y * w + x] >= 0) continue;
        const box = { x0: x, x1: x, y0: y, y1: y, n: 0 };
        const todo = [[x, y]];
        label[y * w + x] = poses.length;
        while (todo.length) {
            const [a, b] = todo.pop();
            box.n++;
            box.x0 = Math.min(box.x0, a); box.x1 = Math.max(box.x1, a);
            box.y0 = Math.min(box.y0, b); box.y1 = Math.max(box.y1, b);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = a + dx, ny = b + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const j = ny * w + nx;
                    if (cleared[j] || label[j] >= 0) continue;
                    label[j] = poses.length;
                    todo.push([nx, ny]);
                }
            }
        }
        poses.push(box);
    }
}
// Big areas only (specks of stray colour are dropped), in reading order: rows by height, then left to right
const figures = poses.filter(p => p.n > 100);
if (figures.length !== 6) throw new Error(`expected 6 poses on the sheet, found ${figures.length}`);
const rowSplit = h / 2;
const row = figures.filter(p => (p.y0 + p.y1) / 2 < rowSplit === (ROW === 0)).sort((p, q) => p.x0 - q.x0);

fs.mkdirSync(OUT_DIR, { recursive: true });
row.forEach((box, index) => {
    const id = poses.indexOf(box);
    const pw = box.x1 - box.x0 + 1;
    const ph = box.y1 - box.y0 + 1;
    const out = new PNG({ width: pw, height: ph });
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const sx = box.x0 + x, sy = box.y0 + y;
            if (label[sy * w + sx] !== id) continue; // only this pose (no bits of a neighbour)
            const i = (sy * w + sx) * 4, j = (y * pw + x) * 4;
            for (let k = 0; k < 4; k++) out.data[j + k] = small.data[i + k];
        }
    }
    writePng(path.join(OUT_DIR, `${POSES[index]}.png`), out);
});
console.log(`smok: ${SOURCE} (drawn pixel ${size}px, grid at ${gx.phase},${gy.phase}) -> row ${ROW}: ` +
    row.map((b, i) => `${POSES[i]} ${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1}`).join(', ') + ` -> ${OUT_DIR}/`);
