// Small pixel-art helpers shared by the character tools (make-kiwi.mjs, make-sofi.mjs). Images are pngjs PNGs
// with one pixel per drawn pixel (see extract-pixel-grid.mjs).
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { extractPixelGrid } from './extract-pixel-grid.mjs';

/** Reads an upscaled AI image and returns it as true pixel art. */
export function readPixelArt(file) {
    return extractPixelGrid(PNG.sync.read(fs.readFileSync(file)));
}

export function writePng(file, img) {
    fs.writeFileSync(file, PNG.sync.write(img));
}

export function clone(img) {
    const copy = new PNG({ width: img.width, height: img.height });
    img.data.copy(copy.data);
    return copy;
}

export function setPixel(img, x, y, hex) {
    const i = (y * img.width + x) * 4;
    img.data[i] = parseInt(hex.slice(1, 3), 16);
    img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
    img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
    img.data[i + 3] = 255;
}

const inRect = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/**
 * Moves the pixels of a part (e.g. a leg: list of rectangles) up by `n`; what's left below becomes transparent.
 * `bottom` is the lowest row to process.
 */
export function liftPart(img, source, rects, n, bottom) {
    for (const { x0, x1, y0 } of rects) {
        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= bottom; y++) {
                const i = (y * img.width + x) * 4;
                const from = y + n;
                if (rects.some(r => inRect(x, from, r))) {
                    const j = (from * source.width + x) * 4;
                    for (let k = 0; k < 4; k++) img.data[i + k] = source.data[j + k];
                } else if (rects.some(r => inRect(x, y, r))) {
                    img.data[i + 3] = 0;
                }
            }
        }
    }
}

const luminance = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
// Kept as they are when recolouring: tongue pink (a red with some blue, unlike orange fur) and eye shine
const keepColor = (r, g, b) => (r > 150 && r - g > 70 && b > 0.6 * g) || (r > 235 && g > 235 && b > 235);

function opaqueLuminances(img) {
    const values = [];
    for (let i = 0; i < img.data.length; i += 4) {
        if (!img.data[i + 3]) continue;
        const [r, g, b] = img.data.subarray(i, i + 3);
        if (!keepColor(r, g, b)) values.push(luminance(r, g, b));
    }
    return values.sort((a, b) => a - b);
}

/**
 * Repaints `source` in the colours of `target` (e.g. one sister's pose in the other's fur):
 * brightness is matched at the outline, quartiles and highlight (histogram matching), then each pixel gets the
 * target colour closest to its new brightness. `darken` rectangles (e.g. ears) are pushed toward darker tones.
 */
export function recolorLike(source, target, { darken = [], darkenFactor = 0.68 } = {}) {
    const quantile = (values, q) => values[Math.min(values.length - 1, Math.floor(q * values.length))];
    const S = opaqueLuminances(source);
    const T = opaqueLuminances(target);
    const points = [0.02, 0.25, 0.5, 0.75, 0.99].map(q => [quantile(S, q), quantile(T, q)]);
    const mapLuminance = (l) => {
        for (let i = 1; i < points.length; i++) {
            const [a, ta] = points[i - 1];
            const [b, tb] = points[i];
            if (l <= b || i === points.length - 1) {
                return b === a ? tb : ta + (tb - ta) * Math.max(0, Math.min(1, (l - a) / (b - a)));
            }
        }
        return l;
    };

    // The target's palette (colours used at least 3 times, to skip anti-aliasing noise)
    const counts = new Map();
    for (let i = 0; i < target.data.length; i += 4) {
        if (!target.data[i + 3]) continue;
        const [r, g, b] = target.data.subarray(i, i + 3);
        if (keepColor(r, g, b)) continue;
        const key = (r << 16) | (g << 8) | b;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const palette = [...counts]
        .filter(([, n]) => n >= 3)
        .map(([key]) => { const c = [key >> 16, (key >> 8) & 255, key & 255]; return { c, l: luminance(...c) }; });

    const out = clone(source);
    for (let i = 0; i < out.data.length; i += 4) {
        if (!out.data[i + 3]) continue;
        const [r, g, b] = out.data.subarray(i, i + 3);
        if (keepColor(r, g, b)) continue;
        const x = (i / 4) % out.width;
        const y = Math.floor(i / 4 / out.width);
        const mapped = mapLuminance(luminance(r, g, b));
        const want = mapped > 60 && darken.some(rect => inRect(x, y, rect)) ? mapped * darkenFactor : mapped;
        let best = palette[0];
        for (const p of palette) if (Math.abs(p.l - want) < Math.abs(best.l - want)) best = p;
        out.data[i] = best.c[0];
        out.data[i + 1] = best.c[1];
        out.data[i + 2] = best.c[2];
    }
    return out;
}
