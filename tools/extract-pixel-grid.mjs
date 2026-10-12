#!/usr/bin/env node
/**
 * Turns upscaled "pixel-art style" art (e.g. a 1024px AI image drawn on a ~19px block grid) into true pixel art:
 * one image pixel per drawn pixel, ready to edit by hand or by script.
 *
 *   node tools/extract-pixel-grid.mjs <input.png> <output.png>
 *   import { extractPixelGrid } from './extract-pixel-grid.mjs'   (used by make-kiwi.mjs)
 *
 * 1. finds the block size (same edge autocorrelation as build-sprites.mjs)
 * 2. finds where the grid starts (the offset whose block boundaries line up with the strongest edges)
 * 3. samples the middle of every block; blocks that are mostly transparent become transparent
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

/** @returns {{ image: PNG, block: number }} one pixel per drawn pixel, plus the measured block size */
export function extractPixelGrid(img) {
const { width: W, height: H, data } = img;
const alpha = (x, y) => data[(y * W + x) * 4 + 3];
const lum = (x, y) => {
    const i = (y * W + x) * 4;
    return data[i + 3] < 128 ? -1 : 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
};

// Edge strength per column / row (only between two opaque pixels, or at the outline)
const edgesX = new Float64Array(W);
const edgesY = new Float64Array(H);
for (let y = 1; y < H; y++) {
    for (let x = 1; x < W; x++) {
        const c = lum(x, y), left = lum(x - 1, y), up = lum(x, y - 1);
        if ((c < 0) !== (left < 0)) edgesX[x] += 255; else if (c >= 0) edgesX[x] += Math.abs(c - left);
        if ((c < 0) !== (up < 0)) edgesY[y] += 255; else if (c >= 0) edgesY[y] += Math.abs(c - up);
    }
}

function autocorrelation(p, maxLag) {
    const mean = p.reduce((s, v) => s + v, 0) / p.length;
    const r = new Float64Array(maxLag + 2);
    for (let lag = 1; lag <= maxLag + 1; lag++) {
        let s = 0;
        for (let i = 0; i + lag < p.length; i++) s += (p[i] - mean) * (p[i + lag] - mean);
        r[lag] = s;
    }
    return r;
}

const rx = autocorrelation(edgesX, 120);
const ry = autocorrelation(edgesY, 120);
const r = rx.map((v, i) => v + (ry[i] ?? 0));
let coarse = 8;
for (let lag = 8; lag <= 40; lag++) if (r[lag] > r[coarse]) coarse = lag;
let num = 0, den = 0;
for (let k = 1; k <= 4; k++) {
    const center = k * coarse;
    let best = center;
    for (let lag = center - k; lag <= center + k; lag++) if (r[lag] > r[best]) best = lag;
    const [y0, y1, y2] = [r[best - 1], r[best], r[best + 1]];
    const d = y0 - 2 * y1 + y2;
    num += (best + (d === 0 ? 0 : (y0 - y2) / (2 * d))) * k;
    den += k * k;
}
const block = num / den;

// Grid offset: try sub-pixel phases, keep the one whose boundaries collect the most edge strength
function bestPhase(edges) {
    let best = 0, bestScore = -1;
    for (let phase = 0; phase < block; phase += 0.25) {
        let score = 0;
        for (let b = phase; b < edges.length; b += block) score += edges[Math.round(b)] ?? 0;
        if (score > bestScore) { bestScore = score; best = phase; }
    }
    return best;
}
const phaseX = bestPhase(edgesX);
const phaseY = bestPhase(edgesY);

const cols = Math.floor((W - phaseX) / block);
const rows = Math.floor((H - phaseY) / block);
const out = new PNG({ width: cols, height: rows });
for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
        // Average the inner 50% of the block (avoids the blurry block borders of AI art)
        let rr = 0, gg = 0, bb = 0, n = 0, opaque = 0;
        const x0 = phaseX + gx * block, y0 = phaseY + gy * block;
        for (let y = Math.ceil(y0 + block * 0.25); y < y0 + block * 0.75; y++) {
            for (let x = Math.ceil(x0 + block * 0.25); x < x0 + block * 0.75; x++) {
                n++;
                if (alpha(x, y) < 128) continue;
                const i = (y * W + x) * 4;
                rr += data[i]; gg += data[i + 1]; bb += data[i + 2]; opaque++;
            }
        }
        const o = (gy * cols + gx) * 4;
        if (opaque > n / 2) {
            out.data[o] = Math.round(rr / opaque);
            out.data[o + 1] = Math.round(gg / opaque);
            out.data[o + 2] = Math.round(bb / opaque);
            out.data[o + 3] = 255;
        }
    }
}
return { image: out, block };
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) {
        console.error('usage: node tools/extract-pixel-grid.mjs <input.png> <output.png>');
        process.exit(1);
    }
    const { image, block } = extractPixelGrid(PNG.sync.read(fs.readFileSync(input)));
    fs.writeFileSync(output, PNG.sync.write(image));
    console.log(`block ${block.toFixed(2)}px -> ${image.width}x${image.height} pixels: ${output}`);
}
