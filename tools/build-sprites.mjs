#!/usr/bin/env node
/**
 * Builds the character spritesheets the game loads from the raw art in art/raw/.
 *
 *   npm run build:sprites
 *
 * The raw images are ~1024px "pixel-art style" drawings, but each pose was drawn at a different
 * scale (Kiwi's jump pose is ~26% bigger than her idle pose), so swapping textures made the dog
 * visibly grow and shrink. For every frame this script:
 *
 *   1. finds the dog (pixels with alpha >= ALPHA_CUTOFF) and drops the faint background haze
 *   2. measures the size of one drawn "pixel" (the block grid) via autocorrelation of edges
 *   3. rescales so that every frame uses the same ART_PIXEL size
 *   4. places all frames in equal-size cells, centered, with the feet on the bottom edge
 *
 * Output (commit it — the game and CI don't run this script):
 *   assets/characters/<character>.png   one horizontal strip per character, one cell per distinct source file
 *   assets/characters/sprites.json      frame size, per-frame opaque bounds (used for hitboxes) and the
 *                                       frame list of every animation state
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const RAW_DIR = 'art/raw';
const OUT_DIR = 'assets/characters';

// Output texture px per drawn "pixel". The game draws sprites at scale 1, so one texture pixel is one
// screen pixel: that lets Phaser snap them to whole pixels while moving (no subpixel blur).
const ART_PIXEL = 2;
const ALPHA_CUTOFF = 128;  // alpha at or above this is part of the dog, below is haze
const PADDING = 4;         // empty px around the widest/tallest frame (not below the feet)

const STATES = ['idle', 'move', 'jump'];

// Each animation state lists its frames in play order: a file name, or an object with options:
//   lift      draw the image this many output px higher (an airborne moment; the physics body doesn't move)
//   artPixel  size of one drawn pixel in the file; 1 = true pixel art (skips measuring), enlarged exactly
// Identical entries are stored once.
// - Kiwi is true pixel art made from her original design by tools/make-kiwi.mjs (smile, trot, tucked jump),
//   so every pose is the same drawing. Her 4-frame trot bobs up on the passing frames.
// - Sofi alternates her stride pose with her standing pose (stopgap until real walk frames, roadmap M7.1).
const KIWI = (name, options = {}) => ({ file: `kiwi_pixel/${name}.png`, artPixel: 1, ...options });
const SOURCES = {
    kiwi: {
        idle: [KIWI('idle')],
        move: [KIWI('walk_a'), KIWI('idle', { lift: 2 }), KIWI('walk_b'), KIWI('idle', { lift: 2 })],
        // Tucked legs end 3 drawn pixels higher; lift keeps the body where it is when standing
        jump: [KIWI('jump', { lift: 6 })],
    },
    sofi: {
        idle: ['sofi_sprites/smiley.png'],
        move: ['sofi_sprites/smiley_move.png', 'sofi_sprites/smiley.png'],
        jump: ['sofi_sprites/smiley_jump.png'],
    },
};

const entry = (e) => (typeof e === 'string' ? { file: e, lift: 0 } : { lift: 0, ...e });
const entryKey = ({ file, lift }) => `${file}@${lift}`;

function readPng(file) {
    return PNG.sync.read(fs.readFileSync(file));
}

function blank(width, height) {
    return new PNG({ width, height }); // zero-filled = fully transparent
}

function alphaAt(img, x, y) {
    return img.data[(y * img.width + x) * 4 + 3];
}

// Hard alpha cutoff: the AI art has a translucent halo that would show as a faint box.
function dropHaze(img) {
    for (let i = 3; i < img.data.length; i += 4) {
        img.data[i] = img.data[i] >= ALPHA_CUTOFF ? 255 : 0;
    }
}

function opaqueBounds(img) {
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
            if (alphaAt(img, x, y) === 0) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (maxX < 0) throw new Error('image is fully transparent');
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Size (in source px) of one drawn "pixel". Edges between blocks repeat with that period, so the
 * autocorrelation of the edge-strength profile peaks at multiples of it. The first few harmonics
 * are combined for sub-pixel precision; higher ones drift on imperfect AI grids.
 */
function measureArtPixel(img) {
    const { width: W, height: H, data } = img;
    const lum = (x, y) => {
        const i = (y * W + x) * 4;
        return data[i + 3] === 0 ? -1 : 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    };
    const edgesX = new Float64Array(W);
    const edgesY = new Float64Array(H);
    for (let y = 1; y < H; y++) {
        for (let x = 1; x < W; x++) {
            const c = lum(x, y);
            if (c < 0) continue;
            const left = lum(x - 1, y);
            const up = lum(x, y - 1);
            if (left >= 0) edgesX[x] += Math.abs(c - left);
            if (up >= 0) edgesY[y] += Math.abs(c - up);
        }
    }
    const MAX_LAG = 120;
    const autocorrelation = (p) => {
        const mean = p.reduce((s, v) => s + v, 0) / p.length;
        const r = new Float64Array(MAX_LAG + 2);
        for (let lag = 1; lag <= MAX_LAG + 1; lag++) {
            let s = 0;
            for (let i = 0; i + lag < p.length; i++) s += (p[i] - mean) * (p[i + lag] - mean);
            r[lag] = s;
        }
        return r;
    };
    const rx = autocorrelation(edgesX);
    const ry = autocorrelation(edgesY);
    const r = rx.map((v, i) => v + ry[i]);

    let coarse = 8;
    for (let lag = 8; lag <= 40; lag++) if (r[lag] > r[coarse]) coarse = lag;

    let num = 0, den = 0;
    for (let k = 1; k <= 4 && k * coarse < MAX_LAG; k++) {
        const center = k * coarse;
        let best = center;
        for (let lag = center - k; lag <= center + k; lag++) if (r[lag] > r[best]) best = lag;
        // parabolic interpolation around the discrete peak
        const [y0, y1, y2] = [r[best - 1], r[best], r[best + 1]];
        const denom = y0 - 2 * y1 + y2;
        const peak = best + (denom === 0 ? 0 : (y0 - y2) / (2 * denom));
        num += peak * k;
        den += k * k;
    }
    return num / den;
}

function crop(img, { x, y, width, height }) {
    const out = blank(width, height);
    PNG.bitblt(img, out, x, y, width, height, 0, 0);
    return out;
}

// Area-average (box filter) resize with premultiplied alpha: no aliasing on big downscales and no
// dark/white fringes from the colour of transparent pixels.
function resizeArea(img, scale) {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const sx = img.width / w;
    const sy = img.height / h;
    const out = blank(w, h);
    for (let oy = 0; oy < h; oy++) {
        const y0 = oy * sy, y1 = y0 + sy;
        for (let ox = 0; ox < w; ox++) {
            const x0 = ox * sx, x1 = x0 + sx;
            let r = 0, g = 0, b = 0, a = 0, total = 0;
            for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
                const wy = Math.min(y + 1, y1) - Math.max(y, y0);
                for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
                    const weight = (Math.min(x + 1, x1) - Math.max(x, x0)) * wy;
                    const i = (y * img.width + x) * 4;
                    const alpha = img.data[i + 3] * weight;
                    r += img.data[i] * alpha;
                    g += img.data[i + 1] * alpha;
                    b += img.data[i + 2] * alpha;
                    a += alpha;
                    total += weight;
                }
            }
            const o = (oy * w + ox) * 4;
            if (a > 0) {
                out.data[o] = Math.round(r / a);
                out.data[o + 1] = Math.round(g / a);
                out.data[o + 2] = Math.round(b / a);
            }
            out.data[o + 3] = Math.round(a / total);
        }
    }
    return out;
}

function buildFrame(file, artPixel) {
    const img = readPng(file);
    dropHaze(img);
    const sourceArtPixel = artPixel ?? measureArtPixel(img);
    const dog = crop(img, opaqueBounds(img));
    return { image: resizeArea(dog, ART_PIXEL / sourceArtPixel), sourceArtPixel };
}

function main() {
    // Build each distinct source file once per character
    const characters = {};
    for (const [character, states] of Object.entries(SOURCES)) {
        const entries = [...new Map(STATES.flatMap(state => states[state].map(entry)).map(e => [entryKey(e), e])).values()];
        const built = new Map(); // build each raw file once, even if it's used with several lifts
        const artPixelOf = (file) => entries.find(e => e.file === file && e.artPixel)?.artPixel;
        characters[character] = {
            entries,
            frames: entries.map(({ file }) => {
                if (!built.has(file)) built.set(file, buildFrame(path.join(RAW_DIR, file), artPixelOf(file)));
                return built.get(file);
            }),
            animations: Object.fromEntries(STATES.map(state => [
                state,
                states[state].map(e => entries.findIndex(x => entryKey(x) === entryKey(entry(e)))),
            ])),
        };
    }

    // One cell size for every frame of every character keeps hitboxes and placement uniform.
    const all = Object.values(characters).flatMap(c => c.frames);
    // Even sizes: with the origin at the bottom-centre, an odd width would put the sprite's edges on half
    // pixels and blur it even when standing still.
    const even = (n) => n + (n % 2);
    const frameWidth = even(Math.max(...all.map(f => f.image.width)) + 2 * PADDING);
    const maxLift = Math.max(...Object.values(characters).flatMap(c => c.entries.map(e => e.lift)));
    const frameHeight = even(Math.max(...all.map(f => f.image.height)) + Math.max(PADDING, maxLift));

    const meta = { frameWidth, frameHeight, artPixel: ART_PIXEL, states: STATES, characters: {} };
    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const [character, { entries, frames, animations }] of Object.entries(characters)) {
        const sheet = blank(frameWidth * frames.length, frameHeight);
        const frameMeta = frames.map(({ image, sourceArtPixel }, index) => {
            const x = Math.round((frameWidth - image.width) / 2);
            const { file, lift } = entries[index];
            const y = frameHeight - image.height - lift; // feet on the bottom edge, unless lifted
            PNG.bitblt(image, sheet, 0, 0, image.width, image.height, index * frameWidth + x, y);
            console.log(`${character}[${index}] ${file}${lift ? ` lift ${lift}` : ''}: drawn pixel ` +
                `${sourceArtPixel.toFixed(2)}px -> ${image.width}x${image.height}`);
            return {
                source: file,
                lift,
                bounds: { x, y, width: image.width, height: image.height },
                sourceArtPixel: Number(sourceArtPixel.toFixed(2)),
            };
        });
        meta.characters[character] = { frames: frameMeta, animations };
        fs.writeFileSync(path.join(OUT_DIR, `${character}.png`), PNG.sync.write(sheet));
    }

    fs.writeFileSync(path.join(OUT_DIR, 'sprites.json'), JSON.stringify(meta, null, 2) + '\n');
    console.log(`frame ${frameWidth}x${frameHeight} -> ${OUT_DIR}/`);
}

main();
