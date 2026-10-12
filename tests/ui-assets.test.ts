import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';

// UI images are drawn unscaled and centred, so they must be baked at display size with even dimensions
// (an odd width puts a centred image on half pixels and blurs it). Rebuild with `npm run build:sprites`.
describe('baked UI images', () => {
    it('title logo is 320px tall with even dimensions', () => {
        const logo = PNG.sync.read(fs.readFileSync('assets/ui/logo.png'));
        expect(logo.height).toBe(320);
        expect(logo.width % 2).toBe(0);
        expect(logo.height % 2).toBe(0);
    });
});
