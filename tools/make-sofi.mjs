#!/usr/bin/env node
/**
 * Sofi's sprite frames as true pixel art, plus her duck (crouch) and crawl poses made from her own design:
 *
 *   npm run art:sofi        (then `npm run build:sprites`)
 *
 * 1. her standing, walking and leaping images -> true pixel art (same pixel scale as Kiwi)
 * 2. crouch: she lies down to duck under things. Her legs disappear under her body, the body drops onto her
 *    paws, and her head drops a little further so the chin rests low in front.
 * 3. crawl: a 4-step creep. Her two front paws reach forward in turn (whole paws, outline included), and on the
 *    steps in between her body and head lift by one pixel onto short legs, so she bobs along instead of sliding.
 *
 * Output (commit it): art/raw/sofi_pixel/{idle,walk,jump,crouch,crawl_a..crawl_d}.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { readPixelArt, writePng } from './pixel-art.mjs';

const SOURCES = {
    idle: 'art/raw/sofi_sprites/smiley.png',
    walk: 'art/raw/sofi_sprites/smiley_move.png',
    jump: 'art/raw/sofi_sprites/smiley_jump.png',
};
const OUT_DIR = 'art/raw/sofi_pixel';

// Read off the extracted 51x51 standing pose
const HEAD = { maxY: 29, minX: 18 };    // head + ears: rows up to 29, right of the tail
const LEGS_TOP = 37;                    // rows 37-42 are legs, 43-44 the paws
const PAWS = { y0: 43, y1: 44 };
// Columns of each paw (the back paws are one block under her body; the front two are separate)
const PAW_COLUMNS = { back: [0, 20], near: [21, 30], far: [31, 50] };
const BODY_DROP = 6;                    // body lands on the paws
const HEAD_DROP = 9;                    // chin lower than the body line

/**
 * The lying-down pose, composed from the standing one. `paws` moves each paw sideways (art px, + = forward);
 * `lift` raises body and head that many rows, and the legs' lowest row fills the gap so she stands on her paws.
 */
function crouch(standing, { paws = {}, lift = 0 } = {}) {
    const { width, height } = standing;
    const out = new PNG({ width, height });
    const copy = (sx, sy, dx, dy) => {
        if (dx < 0 || dx >= width || dy < 0 || dy >= height) return;
        const i = (sy * width + sx) * 4;
        if (!standing.data[i + 3]) return;
        const j = (dy * width + dx) * 4;
        for (let k = 0; k < 4; k++) out.data[j + k] = standing.data[i + k];
    };
    const shiftOf = (x) => {
        const paw = Object.entries(PAW_COLUMNS).find(([, [x0, x1]]) => x >= x0 && x <= x1)?.[0];
        return paws[paw] ?? 0;
    };
    // Paws stay on the ground; a lifted body shows the bottom of her legs above them
    for (let x = 0; x < width; x++) {
        const dx = x + shiftOf(x);
        for (let y = PAWS.y0; y <= PAWS.y1; y++) copy(x, y, dx, y);
        for (let row = 1; row <= lift; row++) copy(x, PAWS.y0 - 1, dx, PAWS.y0 - row);
    }
    // Body and tail drop onto the paws; the legs end up hidden under the body
    for (let y = 0; y < LEGS_TOP; y++) {
        for (let x = 0; x < width; x++) {
            const isHead = y <= HEAD.maxY && x >= HEAD.minX;
            if (!isHead) copy(x, y, x, y + BODY_DROP - lift);
        }
    }
    // Head drops further and is drawn in front
    for (let y = 0; y <= HEAD.maxY; y++) {
        for (let x = HEAD.minX; x < width; x++) copy(x, y, x, y + HEAD_DROP - lift);
    }
    return out;
}

const pixelArt = Object.fromEntries(Object.entries(SOURCES).map(([name, file]) => [name, readPixelArt(file)]));
const idle = pixelArt.idle.image;

const frames = {
    idle,
    walk: pixelArt.walk.image,
    jump: pixelArt.jump.image,
    crouch: crouch(idle),
    // Each front paw reaches 3px forward once per cycle, then pushes back 1px a step while the other one reaches.
    // The body lifts between reaches.
    crawl_a: crouch(idle, { paws: { near: 2, far: 0 } }),
    crawl_b: crouch(idle, { paws: { near: 1, far: -1 }, lift: 1 }),
    crawl_c: crouch(idle, { paws: { near: 0, far: 2 } }),
    crawl_d: crouch(idle, { paws: { near: -1, far: 1 }, lift: 1 }),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, img] of Object.entries(frames)) writePng(path.join(OUT_DIR, `${name}.png`), img);
const blocks = Object.entries(pixelArt).map(([name, { block }]) => `${name} ${block.toFixed(2)}px`).join(', ');
console.log(`sofi: drawn pixels ${blocks} -> ${OUT_DIR}/{${Object.keys(frames).join(',')}}.png`);
