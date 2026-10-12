// Placeholder art drawn in code, shared by the title screen and the game. A Tiled tileset and real art replace
// this later (docs/decisions.md, roadmap M2/M7).
import Phaser from 'phaser';
import { ANIMATION_FRAME_RATE, CHARACTERS, CHARACTER_KEYS, type AnimationState } from '../characters';
import { TILE, VIEW } from './shared';

/** Bakes ground tiles, clouds, hills and the dog house into textures (once; textures outlive scenes). */
export function bakePlaceholderTextures(scene: Phaser.Scene): void {
    if (scene.textures.exists('grass')) return;

    // make, not add: the Graphics is only used to bake textures and must not stay on screen
    const g = scene.make.graphics({}, false);

    g.fillStyle(0x8b5a2b).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x6f4520);
    const specks: Array<[number, number]> = [[4, 6], [18, 3], [26, 14], [9, 20], [21, 25], [3, 28], [14, 12]];
    specks.forEach(([x, y]) => g.fillRect(x, y, 3, 3));
    g.generateTexture('dirt', TILE, TILE);

    // Same dirt with a grass strip on top
    g.fillStyle(0x4caf50).fillRect(0, 0, TILE, 8).fillRect(5, 8, 4, 3).fillRect(19, 8, 5, 2);
    g.fillStyle(0x7ed957).fillRect(0, 0, TILE, 3);
    g.generateTexture('grass', TILE, TILE);

    g.clear();
    g.fillStyle(0xffffff).fillEllipse(40, 30, 60, 30).fillEllipse(70, 22, 50, 34).fillEllipse(95, 32, 50, 26);
    g.generateTexture('cloud', 130, 50);

    g.clear();
    g.fillStyle(0xa5d6a7).fillEllipse(200, 120, 400, 240);
    g.generateTexture('hill', 400, 120);

    // Dog house: roof, plank walls, arched door
    g.clear();
    g.fillStyle(0xd9a066).fillRect(14, 62, 132, 78);
    g.fillStyle(0xb9854f);
    for (let y = 76; y < 140; y += 14) g.fillRect(14, y, 132, 3);
    g.fillStyle(0x3b2414).fillRect(55, 100, 50, 40).fillCircle(80, 100, 25);
    g.fillStyle(0xc0392b).fillTriangle(0, 62, 80, 4, 160, 62);
    g.fillStyle(0x922b21).fillRect(0, 58, 160, 8);
    g.lineStyle(3, 0x5d3a1a).strokeRect(14, 62, 132, 78).strokeTriangle(0, 62, 80, 4, 160, 62);
    g.generateTexture('doghouse', 160, 142);

    g.destroy();
}

/**
 * Character animations (`${character}_${state}`). Animations are global to the game, so every scene and the
 * remote co-op players share them. Frame lists come from sprites.json (tools/build-sprites.mjs).
 */
export function createCharacterAnimations(scene: Phaser.Scene): void {
    CHARACTER_KEYS.forEach(character => {
        // Base states for everyone, plus crouch/crawl for characters that have them
        const animations = CHARACTERS[character].sprites.animations;
        (Object.keys(animations) as AnimationState[]).forEach(state => {
            const key = `${character}_${state}`;
            const frameList = animations[state];
            if (scene.anims.exists(key) || !frameList) return;
            const frames = frameList.map(frame => ({ key: character, frame }));
            scene.anims.create({ key, frames, frameRate: ANIMATION_FRAME_RATE[state], repeat: -1 });
        });
    });
}

/**
 * Clouds and hills. Parallax: things further away scroll slower than the camera (scrollFactor < 1).
 * Seeded random so the backdrop is the same on every run. `worldWidth` = how far the camera can scroll.
 */
export function addBackdrop(scene: Phaser.Scene, worldWidth: number, groundY: number): void {
    const rnd = new Phaser.Math.RandomDataGenerator(['maltipoo']);
    const maxScroll = Math.max(0, worldWidth - VIEW.width);

    for (let x = -50; x < maxScroll * 0.2 + VIEW.width; x += rnd.between(160, 300)) {
        scene.add.image(x, rnd.between(40, 220), 'cloud')
            .setScrollFactor(0.2)
            .setScale(rnd.realInRange(0.6, 1.3))
            .setAlpha(rnd.realInRange(0.7, 0.95));
    }
    for (let x = -100; x < maxScroll * 0.5 + VIEW.width; x += rnd.between(250, 380)) {
        scene.add.image(x, groundY + 8, 'hill')
            .setOrigin(0, 1)
            .setScrollFactor(0.5)
            .setScale(rnd.realInRange(0.8, 1.2), rnd.realInRange(0.7, 1.4));
    }
}

/** A strip of ground (grass on top, dirt below) from `x` to `x + width`, down to the bottom of the screen. */
export function addGroundStrip(scene: Phaser.Scene, x: number, groundY: number, width: number, height = VIEW.height - groundY): void {
    scene.add.tileSprite(x, groundY, width, TILE, 'grass').setOrigin(0, 0);
    if (height > TILE) scene.add.tileSprite(x, groundY + TILE, width, height - TILE, 'dirt').setOrigin(0, 0);
}
