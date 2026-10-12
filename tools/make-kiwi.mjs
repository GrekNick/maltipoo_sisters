#!/usr/bin/env node
/**
 * Kiwi's sprite frames, made from her original standing design so every pose is the same drawing:
 *
 *   npm run art:kiwi        (then `npm run build:sprites`)
 *
 * 1. art/raw/kiwi_sprites/chill.png (the original 1024px AI image) -> true pixel art, 1px per drawn pixel
 * 2. the serious mouth becomes a smile with a little tongue
 * 3. walk and jump poses are made by lifting legs (a trot lifts diagonal leg pairs in turn)
 *
 * Output (commit it): art/raw/kiwi_pixel/{idle,walk_a,walk_b,jump}.png, 52x52 true pixel art. These are
 * normal PNGs: they can also be opened in a pixel editor (Aseprite, Piskel) for hand tweaks, as long as the
 * edits are also made here (or this script stops being run).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { extractPixelGrid } from './extract-pixel-grid.mjs';

const SOURCE = 'art/raw/kiwi_sprites/chill.png';
const OUT_DIR = 'art/raw/kiwi_pixel';

// Colours sampled from Kiwi's own palette, plus a tongue that matches Sofi's
const COLOR = {
    outline: '#501705',
    mouth: '#300d00',
    muzzle: '#ec942d',
    muzzleShade: '#d67d1f',
    tongue: '#e8695b',
    tongueShade: '#c2453a',
};

function setPixel(img, x, y, hex) {
    const i = (y * img.width + x) * 4;
    img.data[i] = parseInt(hex.slice(1, 3), 16);
    img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
    img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
    img.data[i + 3] = 255;
}

/** Replaces the serious mouth (a small inverted V under the nose) with an open U-shaped smile. */
function addSmile(img) {
    const paint = (color, points) => points.forEach(([x, y]) => setPixel(img, x, y, COLOR[color]));
    // Light muzzle around the mouth so its shape reads against the darker chin
    paint('muzzle', [[31, 26], [32, 26], [39, 26], [40, 26]]);
    paint('muzzleShade', [[32, 27], [33, 27], [38, 27], [39, 27], [33, 28], [34, 28], [37, 28], [38, 28]]);
    // Corners level with the bottom of the nose, then the U
    paint('outline', [[32, 25], [39, 25], [33, 26], [38, 26], [34, 27], [37, 27], [35, 28], [36, 28]]);
    paint('mouth', [[34, 26], [35, 26], [36, 26], [37, 26]]);
    paint('tongue', [[35, 27]]);
    paint('tongueShade', [[36, 27]]);
}

// Each leg as the pixels it covers (x range per row band), read off the extracted 52x52 grid
const LEGS = {
    backNear: [{ x0: 8, x1: 14, y0: 38, y1: 44 }, { x0: 15, x1: 15, y0: 43, y1: 44 }],
    backFar: [{ x0: 15, x1: 20, y0: 38, y1: 42 }],
    frontNear: [{ x0: 21, x1: 29, y0: 38, y1: 45 }],
    frontFar: [{ x0: 30, x1: 37, y0: 38, y1: 45 }],
};
const LEG_BOTTOM = 45;

function clone(img) {
    const copy = new PNG({ width: img.width, height: img.height });
    img.data.copy(copy.data);
    return copy;
}

/** Moves a leg's pixels up by `n` (the foot leaves the ground); what's left below becomes transparent. */
function liftLeg(img, source, parts, n) {
    for (const { x0, x1, y0 } of parts) {
        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= LEG_BOTTOM; y++) {
                const i = (y * img.width + x) * 4;
                const from = y + n;
                const inLeg = parts.some(p => x >= p.x0 && x <= p.x1 && from >= p.y0 && from <= p.y1);
                if (inLeg) {
                    const j = (from * source.width + x) * 4;
                    for (let k = 0; k < 4; k++) img.data[i + k] = source.data[j + k];
                } else if (parts.some(p => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1)) {
                    img.data[i + 3] = 0;
                }
            }
        }
    }
}

function pose(base, lifts) {
    const img = clone(base);
    for (const [leg, n] of Object.entries(lifts)) liftLeg(img, base, LEGS[leg], n);
    return img;
}

const { image: idle, block } = extractPixelGrid(PNG.sync.read(fs.readFileSync(SOURCE)));
addSmile(idle);

const frames = {
    idle,
    // Trot: diagonal pairs lift in turn
    walk_a: pose(idle, { frontNear: 2, backFar: 2 }),
    walk_b: pose(idle, { frontFar: 2, backNear: 2 }),
    // Legs tucked in the air
    jump: pose(idle, { frontNear: 3, frontFar: 3, backNear: 2, backFar: 2 }),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, img] of Object.entries(frames)) {
    fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), PNG.sync.write(img));
}
console.log(`kiwi: ${SOURCE} (drawn pixel ${block.toFixed(2)}px) -> ${idle.width}x${idle.height} -> ${OUT_DIR}/{${Object.keys(frames).join(',')}}.png`);
