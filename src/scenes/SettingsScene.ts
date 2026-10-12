// Settings, saved in the browser. Sound and language arrive with roadmap M3.2 / M3.6 (audio, i18n).
import Phaser from 'phaser';
import { loadSettings, saveSettings, type Settings } from '../persistence';
import { Menu } from '../ui/Menu';
import { addBackdrop, addGroundStrip } from './art';
import { SceneKey, SKY_COLOR, TEXT_STYLE, VIEW } from './shared';

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

        this.add.text(VIEW.width / 2, 90, 'Settings', {
            fontSize: '48px', fontStyle: 'bold', color: '#ffe082', stroke: '#5d3a1a', strokeThickness: 8,
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
            { label: 'Sound: coming soon', enabled: false },
            { label: 'Language: English (more soon)', enabled: false },
            { label: 'Back', onSelect: back },
        ], 420);

        this.input.keyboard?.on('keydown-ESC', back);
        this.add.text(VIEW.width / 2, 580, 'Esc to go back', { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0.5);
    }

    private hitboxLabel(): string {
        return `Show hitboxes: ${this.settings.showHitboxes ? 'On' : 'Off'}`;
    }
}
