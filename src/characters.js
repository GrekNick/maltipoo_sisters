import kiwiIdle from '../assests/kiwi_sprites/chill.png';
import kiwiMove from '../assests/kiwi_sprites/chill_move.png';
import kiwiJump from '../assests/kiwi_sprites/chill_jump.png';
import sofiIdle from '../assests/sofi_sprites/smiley.png';
import sofiMove from '../assests/sofi_sprites/smiley_move.png';
import sofiJump from '../assests/sofi_sprites/smiley_jump.png';

// Source art is ~1024px; rendered at ~100px on screen.
export const SPRITE_SCALE = 0.1;

// Animation states every character provides. Texture and animation keys are `${character}_${state}`.
export const ANIMATION_STATES = ['idle', 'move', 'jump'];

export const CHARACTERS = {
    kiwi: {
        name: 'Kiwi',
        textures: { idle: kiwiIdle, move: kiwiMove, jump: kiwiJump },
    },
    sofi: {
        name: 'Sofi',
        textures: { idle: sofiIdle, move: sofiMove, jump: sofiJump },
    },
};

export const CHARACTER_KEYS = Object.keys(CHARACTERS);
