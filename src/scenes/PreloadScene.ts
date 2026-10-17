// Loads everything once, shows a loading bar, then opens the title screen.
import Phaser from 'phaser';
import { CHARACTERS, FRAME_SIZE } from '../characters';
import logoUrl from '../../assets/ui/logo.png';
import { LEVELS, TILESETS } from '../levels';
import { bakePlaceholderTextures, createCharacterAnimations } from './art';
import { SceneKey, SKY_COLOR, TEXT_STYLE, VIEW } from './shared';

const BAR = { width: 320, height: 16 } as const;

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super(SceneKey.Preload);
    }

    preload() {
        // The bar is drawn with plain shapes, so it needs no assets of its own
        this.cameras.main.setBackgroundColor(SKY_COLOR);
        const x = VIEW.width / 2;
        const y = VIEW.height / 2;
        this.add.text(x, y - 36, 'Loading…', TEXT_STYLE).setOrigin(0.5);
        this.add.rectangle(x, y, BAR.width + 8, BAR.height + 8).setStrokeStyle(2, 0xffffff);
        const bar = this.add.rectangle(x - BAR.width / 2, y, 0, BAR.height, 0xffe082).setOrigin(0, 0.5);
        this.load.on('progress', (progress: number) => bar.setSize(BAR.width * progress, BAR.height));

        this.load.image('logo', logoUrl);
        LEVELS.forEach(level => this.load.tilemapTiledJSON(level.key, level.url));
        TILESETS.forEach(tileset => this.load.image(tileset.key, tileset.url));
        Object.entries(CHARACTERS).forEach(([character, { sheet }]) => {
            this.load.spritesheet(character, sheet, { frameWidth: FRAME_SIZE.width, frameHeight: FRAME_SIZE.height });
        });
    }

    create() {
        bakePlaceholderTextures(this);
        createCharacterAnimations(this);
        this.scene.start(SceneKey.Title);
    }
}
