// Settings, saved in the browser. Sound arrives with roadmap M5.3 (audio).
import Phaser from 'phaser';
import { getLanguage, languageName, LANGUAGES, setLanguage, t } from '../i18n';
import { loadSettings, saveSettings, type Settings } from '../persistence';
import { Menu } from '../ui/Menu';
import { addBackdrop, addGroundStrip } from './art';
import { FONT_FAMILY, SceneKey, SKY_COLOR, TEXT_STYLE, VIEW } from './shared';

const GROUND_Y = 520;

export class SettingsScene extends Phaser.Scene {
    private settings!: Settings;

    constructor() {
        super(SceneKey.Settings);
    }

    create() {
        this.settings = loadSettings();
        this.cameras.main.setBackgroundColor(SKY_COLOR);
        addBackdrop(this, VIEW.width, GROUND_Y);
        addGroundStrip(this, 0, GROUND_Y, VIEW.width);

        this.add.text(VIEW.width / 2, 90, t('settings.title'), {
            fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: '#ffe082', stroke: '#5d3a1a', strokeThickness: 8,
        }).setOrigin(0.5);

        const back = () => this.scene.start(SceneKey.Title);
        const menu = new Menu(this, VIEW.width / 2, 190, [
            {
                label: this.hitboxLabel(),
                onSelect: () => {
                    this.settings = { ...this.settings, showHitboxes: !this.settings.showHitboxes };
                    saveSettings(this.settings);
                    menu.setLabel(0, this.hitboxLabel());
                },
            },
            { label: t('settings.sound'), enabled: false },
            { label: t('settings.language', { language: languageName(getLanguage()) }), onSelect: () => this.nextLanguage() },
            { label: t('menu.back'), onSelect: back },
        ], 420);

        this.input.keyboard?.on('keydown-ESC', back);
        this.add.text(VIEW.width / 2, 580, t('settings.hint'), { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0.5);
    }

    private hitboxLabel(): string {
        return t('settings.hitboxes', { state: t(this.settings.showHitboxes ? 'settings.on' : 'settings.off') });
    }

    /** Cycles English → Українська → Polski, saves it, and rebuilds this screen in the new language. */
    private nextLanguage() {
        const index = LANGUAGES.findIndex(l => l.code === getLanguage());
        const next = LANGUAGES[(index + 1) % LANGUAGES.length]?.code ?? 'en';
        setLanguage(next);
        this.settings = { ...this.settings, language: next };
        saveSettings(this.settings);
        this.scene.restart();
    }
}
