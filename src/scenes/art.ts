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

    // Treat (smaczek): a little bone
    g.clear();
    g.fillStyle(0x7a5230).fillCircle(5, 4, 4).fillCircle(5, 10, 4).fillCircle(19, 4, 4).fillCircle(19, 10, 4).fillRect(5, 3, 14, 8);
    g.fillStyle(0xfff3d6).fillCircle(5, 4, 3).fillCircle(5, 10, 3).fillCircle(19, 4, 3).fillCircle(19, 10, 3).fillRect(5, 4, 14, 6);
    g.fillStyle(0xffffff).fillRect(7, 5, 9, 1);
    g.generateTexture('treat', 24, 14);

    // Sister signs: a post with a board showing the sister's paw, in her fur colour
    for (const [key, fur] of [['sign-kiwi', 0xe08a2c], ['sign-sofi', 0xf3d9a4]] as const) {
        g.clear();
        g.fillStyle(0x5d3a1a).fillRect(17, 22, 6, 26);
        g.fillStyle(0x5d3a1a).fillRoundedRect(0, 0, 40, 26, 5);
        g.fillStyle(0xd9a066).fillRoundedRect(2, 2, 36, 22, 4);
        g.fillStyle(fur).fillCircle(20, 15, 5).fillCircle(13, 8, 2.5).fillCircle(18, 6, 2.5).fillCircle(23, 6, 2.5).fillCircle(28, 8, 2.5);
        g.lineStyle(1, 0x5d3a1a).strokeCircle(20, 15, 5);
        g.generateTexture(key, 40, 48);
    }

    // Language flags (36x24) for the title screen switcher. Drawn, not emoji: Windows shows flag emoji as letters.
    const W = FLAG_SIZE.width, H = FLAG_SIZE.height;
    g.clear(); // Ukrainian: blue over yellow
    g.fillStyle(0x0057b7).fillRect(0, 0, W, H / 2).fillStyle(0xffd700).fillRect(0, H / 2, W, H / 2);
    g.lineStyle(1, 0x1b2631).strokeRect(0.5, 0.5, W - 1, H - 1);
    g.generateTexture('flag-uk', W, H);
    g.clear(); // Polish: white over red
    g.fillStyle(0xffffff).fillRect(0, 0, W, H / 2).fillStyle(0xdc143c).fillRect(0, H / 2, W, H / 2);
    g.lineStyle(1, 0x1b2631).strokeRect(0.5, 0.5, W - 1, H - 1);
    g.generateTexture('flag-pl', W, H);
    g.clear(); // English: a simplified Union Jack
    g.fillStyle(0x012169).fillRect(0, 0, W, H);
    g.lineStyle(5, 0xffffff).lineBetween(0, 0, W, H).lineBetween(W, 0, 0, H);
    g.lineStyle(2, 0xc8102e).lineBetween(0, 0, W, H).lineBetween(W, 0, 0, H);
    g.fillStyle(0xffffff).fillRect(W / 2 - 5, 0, 10, H).fillRect(0, H / 2 - 5, W, 10);
    g.fillStyle(0xc8102e).fillRect(W / 2 - 3, 0, 6, H).fillRect(0, H / 2 - 3, W, 6);
    g.lineStyle(1, 0x1b2631).strokeRect(0.5, 0.5, W - 1, H - 1);
    g.generateTexture('flag-en', W, H);

    g.destroy();
}

export const FLAG_SIZE = { width: 36, height: 24 } as const;

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
