// The start screen: the logo, Start / Settings buttons, and the sisters on a meadow.
import Phaser from 'phaser';
import { Menu } from '../ui/Menu';
import { getLanguage, languageName, LANGUAGES, setLanguage, t, type Language } from '../i18n';
import { saveLanguage } from '../persistence';
import { addBackdrop, addGroundStrip, FLAG_SIZE } from './art';
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

        // The logo is baked at its display size (npm run build:sprites), so it's drawn unscaled and stays sharp
        const logo = this.add.image(VIEW.width / 2, 8, 'logo').setOrigin(0.5, 0);
        this.tweens.add({ targets: logo, y: 14, duration: 1800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        new Menu(this, VIEW.width / 2, 370, [
            { label: t('menu.start'), onSelect: () => this.scene.start(SceneKey.Game) },
            { label: t('menu.settings'), onSelect: () => this.scene.start(SceneKey.Settings) },
        ]);

        this.add.text(VIEW.width / 2, 580, t('title.hint'), { ...TEXT_STYLE, fontSize: '14px' })
            .setOrigin(0.5);

        this.addLanguageFlags();
    }

    /** Top-left corner: one flag per language; the current one is framed. Tap or click to switch. */
    private addLanguageFlags() {
        const gap = 10;
        const y = 16 + FLAG_SIZE.height / 2;
        const nameText = this.add.text(16, y + FLAG_SIZE.height / 2 + 6, '', { ...TEXT_STYLE, fontSize: '13px' });
        LANGUAGES.forEach(({ code }, index) => {
            const x = 16 + FLAG_SIZE.width / 2 + index * (FLAG_SIZE.width + gap);
            const current = code === getLanguage();
            if (current) {
                this.add.rectangle(x, y, FLAG_SIZE.width + 8, FLAG_SIZE.height + 8, 0xffffff).setRounded(4);
            }
            // The tap area reaches 6px past the flag on every side: on a phone the flag is only ~16px wide
            const pad = 6;
            const hitArea = new Phaser.Geom.Rectangle(-pad, -pad, FLAG_SIZE.width + 2 * pad, FLAG_SIZE.height + 2 * pad);
            const flag = this.add.image(x, y, `flag-${code}`)
                .setAlpha(current ? 1 : 0.75)
                .setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
            flag.on('pointerover', () => { flag.setAlpha(1); nameText.setText(languageName(code)); });
            flag.on('pointerout', () => { flag.setAlpha(current ? 1 : 0.75); nameText.setText(''); });
            flag.on('pointerup', () => this.chooseLanguage(code));
        });
    }

    private chooseLanguage(language: Language) {
        if (language === getLanguage()) return;
        setLanguage(language);
        saveLanguage(language);
        this.scene.restart(); // redraw the buttons in the new language
    }

    private addSisters() {
        // Kiwi trots in place, Sofi faces her and hops now and then
        const kiwi = this.add.sprite(170, GROUND_Y, 'kiwi', 0).setOrigin(0.5, 1).play('kiwi_move');
        const sofi = this.add.sprite(630, GROUND_Y, 'sofi', 0).setOrigin(0.5, 1).setFlipX(true).play('sofi_idle');
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
