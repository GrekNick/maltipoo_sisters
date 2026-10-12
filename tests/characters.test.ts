import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import sprites from '../assets/characters/sprites.json';
import { CHARACTERS, CHARACTER_KEYS, FRAME_SIZE, ANIMATION_STATES, SPRITE_SCALE } from '../src/characters';

// src/characters.ts narrows the JSON's `states: string[]` to the AnimationState union; prove that's safe.
it('sprites.json lists exactly the animation states the game knows', () => {
    expect(sprites.states).toEqual(['idle', 'move', 'jump']);
});

// Sprites are drawn unscaled with the origin at the bottom-centre; an odd frame width would put their edges on
// half pixels (blurry). Scale 1 lets Phaser's roundPixels snap them to whole pixels while moving.
it('frames are even-sized and drawn at scale 1, so they stay pixel-sharp', () => {
    expect(FRAME_SIZE.width % 2).toBe(0);
    expect(FRAME_SIZE.height % 2).toBe(0);
    expect(SPRITE_SCALE).toBe(1);
});

describe.each(CHARACTER_KEYS)('%s sprites', (key) => {
    const { frames, hitbox } = CHARACTERS[key];

    it('has one distinct frame per animation state', () => {
        const indices = ANIMATION_STATES.map(state => frames[state]?.frame);
        expect(indices).toEqual(sprites.states.map((_, i) => i));
    });

    it('every frame fits in the cell and has its feet on the bottom edge', () => {
        for (const state of ANIMATION_STATES) {
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
