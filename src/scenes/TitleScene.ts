// The start screen: the sisters on a meadow, the title, and Start / Settings buttons.
import Phaser from 'phaser';
import { Menu } from '../ui/Menu';
import { addBackdrop, addGroundStrip } from './art';
import { SceneKey, SKY_COLOR, TEXT_STYLE, VIEW } from './shared';

const GROUND_Y = 520;

export class TitleScene extends Phaser.Scene {
    constructor() {
        super(SceneKey.Title);
    }

    create() {
        this.cameras.main.setBackgroundColor(SKY_COLOR);
        addBackdrop(this, VIEW.width, GROUND_Y);
        addGroundStrip(this, 0, GROUND_Y, VIEW.width);
        this.addSisters();

        this.add.text(VIEW.width / 2, 110, 'Maltipoo Sisters', {
            fontSize: '64px', fontStyle: 'bold', color: '#ffe082', stroke: '#5d3a1a', strokeThickness: 10,
        }).setOrigin(0.5);
        this.add.text(VIEW.width / 2, 172, 'A Kraków adventure', { ...TEXT_STYLE, fontSize: '22px' }).setOrigin(0.5);

        new Menu(this, VIEW.width / 2, 260, [
            { label: 'Start', onSelect: () => this.scene.start(SceneKey.Game) },
            { label: 'Settings', onSelect: () => this.scene.start(SceneKey.Settings) },
        ]);

        this.add.text(VIEW.width / 2, 580, '↑/↓ to choose · Enter to select · or click', { ...TEXT_STYLE, fontSize: '14px' })
            .setOrigin(0.5);
    }

    private addSisters() {
        // Kiwi trots in place, Sofi faces her and hops now and then
        const kiwi = this.add.sprite(300, GROUND_Y, 'kiwi', 0).setOrigin(0.5, 1).play('kiwi_move');
        const sofi = this.add.sprite(500, GROUND_Y, 'sofi', 0).setOrigin(0.5, 1).setFlipX(true).play('sofi_idle');
        // Pixel-sharp at any position, same as in the game
        kiwi.vertexRoundMode = 'fullAuto';
        sofi.vertexRoundMode = 'fullAuto';

        this.time.addEvent({
            delay: 2200,
            loop: true,
            callback: () => {
                sofi.play('sofi_jump');
                this.tweens.add({
                    targets: sofi,
                    y: GROUND_Y - 40,
                    duration: 260,
                    ease: 'Sine.easeOut',
                    yoyo: true,
                    onComplete: () => sofi.play('sofi_idle'),
                });
            },
        });
    }
}
