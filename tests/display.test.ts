import { describe, it, expect } from 'vitest';
import { displayScale } from '../src/display';

const VIEW = { width: 800, height: 600 };

describe('displayScale', () => {
    it('uses a whole number of device pixels per game pixel when that nearly fills the space', () => {
        // 1x screen, room for 2.1x: 2x is crisp and fills 95%
        expect(displayScale({ width: 1700, height: 1300 }, VIEW, 1)).toBe(2);
        // Retina (2x): room for 1.4x CSS = 2.8 device pixels. The whole-pixel option (2 device px = 1x CSS) would fill
        // only 71%, so it fills the space instead
        expect(displayScale({ width: 1120, height: 840 }, VIEW, 2)).toBeCloseTo(1.4, 6);
        // Retina with room for 1.55x CSS = 3.1 device px: 3 device px = 1.5x CSS fills 97%
        expect(displayScale({ width: 1240, height: 930 }, VIEW, 2)).toBe(1.5);
    });

    it('fills the space when the whole-pixel scale would be much smaller (e.g. 1.66x on a 1x screen)', () => {
        const scale = displayScale({ width: 1920, height: 1000 }, VIEW, 1);
        expect(scale).toBeCloseTo(1000 / 600, 6);
    });

    it('keeps the 4:3 shape: the tighter dimension decides', () => {
        expect(displayScale({ width: 2000, height: 600 }, VIEW, 1)).toBe(1);   // short and wide
        expect(displayScale({ width: 800, height: 2000 }, VIEW, 1)).toBe(1);   // narrow and tall
    });

    it('shrinks on small screens (a phone in portrait)', () => {
        const scale = displayScale({ width: 375, height: 700 }, VIEW, 3);
        expect(scale).toBeLessThan(1);
        expect(VIEW.width * scale).toBeLessThanOrEqual(375);
        // 375/800 = 0.47 CSS = 1.41 device px: 1 device px would fill 71%, so it fills
        expect(scale).toBeCloseTo(375 / 800, 6);
    });

    it('never returns a broken size for an empty or hidden container', () => {
        expect(displayScale({ width: 0, height: 0 }, VIEW, 2)).toBe(1);
        expect(displayScale({ width: 800, height: 600 }, VIEW, 0)).toBe(1);
    });
});
