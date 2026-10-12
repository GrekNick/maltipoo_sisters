#!/usr/bin/env node
/**
 * Kiwi's sprite frames, made from her original standing design so every pose is the same drawing:
 *
 *   npm run art:kiwi        (then `npm run build:sprites`)
 *
 * 1. art/raw/kiwi_sprites/chill.png (the original 1024px AI image) -> true pixel art, 1px per drawn pixel
 * 2. the serious mouth becomes a smile with a little tongue
 * 3. walk poses are made by lifting legs (a trot lifts diagonal leg pairs in turn)
 * 4. the jump is Sofi's leap repainted in Kiwi's colours, with darker ears
 *
 * Output (commit it): art/raw/kiwi_pixel/{idle,walk_a,walk_b,jump}.png, 52x52 true pixel art. These are
 * normal PNGs: they can also be opened in a pixel editor (Aseprite, Piskel) for hand tweaks, as long as the
 * edits are also made here (or this script stops being run).
 */
import fs from 'node:fs';
import path from 'node:path';
import { clone, liftPart, readPixelArt, recolorLike, setPixel, writePng } from './pixel-art.mjs';

const SOURCE = 'art/raw/kiwi_sprites/chill.png';
// Kiwi's leap is Sofi's leap pose repainted in Kiwi's colours (her own jump image didn't match her design)
const JUMP_SOURCE = 'art/raw/sofi_sprites/smiley_jump.png';
// Ear flaps in Sofi's leap (read off its 58x58 grid); Kiwi's ears are darker than her face
const LEAP_EARS = [{ x0: 22, x1: 28, y0: 15, y1: 26 }, { x0: 45, x1: 49, y0: 13, y1: 25 }];
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

function pose(base, lifts) {
    const img = clone(base);
    for (const [leg, n] of Object.entries(lifts)) liftPart(img, base, LEGS[leg], n, LEG_BOTTOM);
    return img;
}

const { image: idle, block } = readPixelArt(SOURCE);
addSmile(idle);

const frames = {
    idle,
    // Trot: diagonal pairs lift in turn
    walk_a: pose(idle, { frontNear: 2, backFar: 2 }),
    walk_b: pose(idle, { frontFar: 2, backNear: 2 }),
    jump: recolorLike(readPixelArt(JUMP_SOURCE).image, idle, { darken: LEAP_EARS }),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, img] of Object.entries(frames)) {
    writePng(path.join(OUT_DIR, `${name}.png`), img);
}
console.log(`kiwi: ${SOURCE} (drawn pixel ${block.toFixed(2)}px) -> ${idle.width}x${idle.height} -> ${OUT_DIR}/{${Object.keys(frames).join(',')}}.png`);
