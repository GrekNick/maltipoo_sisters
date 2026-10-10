import kiwiSheet from '../assets/characters/kiwi.png';
import sofiSheet from '../assets/characters/sofi.png';
import sprites from '../assets/characters/sprites.json';

// Sheets come from `npm run build:sprites` (tools/build-sprites.mjs): every frame uses the same
// size per drawn pixel and has the feet on the frame's bottom edge. They're built at 2x, shown at 0.5.
export const SPRITE_SCALE = 0.5;
export const FRAME_SIZE = { width: sprites.frameWidth, height: sprites.frameHeight };

// Animation states every character provides. Animation keys are `${character}_${state}`.
export const ANIMATION_STATES = sprites.states;

// Physics body relative to the idle pose's opaque bounds (texture px): a bit smaller than the
// art so ledges feel forgiving, bottom edge exactly on the feet. Fixed across animation frames.
const HITBOX_WIDTH_RATIO = 0.7;
const HITBOX_HEIGHT_RATIO = 0.83;

export function hitboxFor(frames) {
    const idle = frames.idle.bounds;
    const width = Math.round(idle.width * HITBOX_WIDTH_RATIO);
    const height = Math.round(idle.height * HITBOX_HEIGHT_RATIO);
    return {
        x: Math.round(idle.x + (idle.width - width) / 2),
        y: idle.y + idle.height - height,
        width,
        height,
    };
}

function character(key, name, sheet) {
    const frames = sprites.characters[key];
    return { name, sheet, frames, hitbox: hitboxFor(frames) };
}

export const CHARACTERS = {
    kiwi: character('kiwi', 'Kiwi', kiwiSheet),
    sofi: character('sofi', 'Sofi', sofiSheet),
};

export const CHARACTER_KEYS = Object.keys(CHARACTERS);
