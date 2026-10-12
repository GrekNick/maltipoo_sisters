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
    const { sprites: { frames, animations }, hitbox } = CHARACTERS[key];

    it('every animation state has frames, and they exist in the sheet', () => {
        for (const state of ANIMATION_STATES) {
            expect(animations[state].length, state).toBeGreaterThan(0);
            for (const index of animations[state]) expect(frames[index], `${state} -> ${index}`).toBeDefined();
        }
    });

    it('the walk animation has more than one frame (legs move)', () => {
        expect(new Set(animations.move).size).toBeGreaterThan(1);
    });

    it('every frame fits in the cell and has its feet on the bottom edge (or lifted on purpose)', () => {
        frames.forEach(({ bounds: { x, y, width, height }, source, lift }) => {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x + width).toBeLessThanOrEqual(FRAME_SIZE.width);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y + height + lift, source).toBe(FRAME_SIZE.height);
        });
    });

    it('idle and jump frames stand on the bottom edge (only walk frames may be lifted)', () => {
        for (const state of ['idle', 'jump'] as const) {
            for (const index of animations[state]) expect(frames[index]?.lift, state).toBe(0);
        }
    });

    it('hitbox sits inside the frame with its bottom on the feet', () => {
        expect(hitbox.x).toBeGreaterThanOrEqual(0);
        expect(hitbox.x + hitbox.width).toBeLessThanOrEqual(FRAME_SIZE.width);
        expect(hitbox.y + hitbox.height).toBe(FRAME_SIZE.height);
    });

    it('spritesheet image matches sprites.json (rerun `npm run build:sprites` if not)', () => {
        const png = PNG.sync.read(fs.readFileSync(`assets/characters/${key}.png`));
        expect(png.width).toBe(FRAME_SIZE.width * frames.length);
        expect(png.height).toBe(FRAME_SIZE.height);
    });
});
