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

// `hitbox` is the physics body rectangle in *texture* pixels (before SPRITE_SCALE), measured on
// the idle pose: bottom edge on the feet, centered on the dog, narrower than the art so ledges
// feel forgiving. It stays fixed across animation frames; re-measure when the art changes
// (press H in game to see the boxes).
export const CHARACTERS = {
    kiwi: {
        name: 'Kiwi',
        textures: { idle: kiwiIdle, move: kiwiMove, jump: kiwiJump },
        // idle opaque bounds: x 125–913, y 152–898 (1024×1024)
        hitbox: { x: 239, y: 278, width: 560, height: 620 },
    },
    sofi: {
        name: 'Sofi',
        textures: { idle: sofiIdle, move: sofiMove, jump: sofiJump },
        // idle opaque bounds: x 113–913, y 128–879 (1000×1000)
        hitbox: { x: 233, y: 259, width: 560, height: 620 },
    },
};

export const CHARACTER_KEYS = Object.keys(CHARACTERS);
