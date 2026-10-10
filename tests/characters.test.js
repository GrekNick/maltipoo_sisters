import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import sprites from '../assets/characters/sprites.json';
import { CHARACTERS, CHARACTER_KEYS, FRAME_SIZE } from '../src/characters.js';

describe.each(CHARACTER_KEYS)('%s sprites', (key) => {
    const { frames, hitbox } = CHARACTERS[key];

    it('has one distinct frame per animation state', () => {
        const indices = sprites.states.map(state => frames[state]?.frame);
        expect(indices).toEqual(sprites.states.map((_, i) => i));
    });

    it('every frame fits in the cell and has its feet on the bottom edge', () => {
        for (const state of sprites.states) {
            const { x, y, width, height } = frames[state].bounds;
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x + width).toBeLessThanOrEqual(FRAME_SIZE.width);
            expect(y + height, state).toBe(FRAME_SIZE.height);
        }
    });

    it('hitbox sits inside the frame with its bottom on the feet', () => {
        expect(hitbox.x).toBeGreaterThanOrEqual(0);
        expect(hitbox.x + hitbox.width).toBeLessThanOrEqual(FRAME_SIZE.width);
        expect(hitbox.y + hitbox.height).toBe(FRAME_SIZE.height);
    });

    it('spritesheet image matches sprites.json (rerun `npm run build:sprites` if not)', () => {
        const png = PNG.sync.read(fs.readFileSync(`assets/characters/${key}.png`));
        expect(png.width).toBe(FRAME_SIZE.width * sprites.states.length);
        expect(png.height).toBe(FRAME_SIZE.height);
    });
});
