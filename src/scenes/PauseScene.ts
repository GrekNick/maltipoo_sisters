// The pause menu, drawn over the frozen level. GameScene is paused, not stopped, so resuming continues exactly
// where the dog was (physics, tweens and the level timer all wait).
import Phaser from 'phaser';
import { t } from '../i18n';
import { Menu } from '../ui/Menu';
import type { MapSceneData } from './MapScene';
import type { SettingsSceneData } from './SettingsScene';
import { FONT_FAMILY, SceneKey, TEXT_STYLE, VIEW } from './shared';

export class PauseScene extends Phaser.Scene {
    constructor() {
        super(SceneKey.Pause);
    }

    create() {
        // Dims the level and catches taps, so the HUD buttons underneath can't be pressed while paused
        this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x000000, 0.5).setOrigin(0, 0).setInteractive();

        this.add.text(VIEW.width / 2, 130, t('pause.title'), {
            fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: '#ffe082', stroke: '#5d3a1a', strokeThickness: 8,
        }).setOrigin(0.5);

        new Menu(this, VIEW.width / 2, 230, [
            { label: t('pause.resume'), onSelect: () => this.resumeGame() },
            { label: t('pause.restart'), onSelect: () => this.scene.start(SceneKey.Game) }, // restarts the paused level
            { label: t('menu.settings'), onSelect: () => this.openSettings() },
            { label: t('pause.quit'), onSelect: () => this.quitToMap() },
        ], 300);

        this.input.keyboard?.on('keydown-ESC', () => this.resumeGame());
        this.input.keyboard?.on('keydown-P', () => this.resumeGame());
        // Under the buttons, not at the bottom edge where the HUD's controls line shows through
        this.add.text(VIEW.width / 2, 470, t('pause.hint'), { ...TEXT_STYLE, fontSize: '16px' }).setOrigin(0.5);
    }

    private resumeGame() {
        this.scene.resume(SceneKey.Game);
        this.scene.stop();
    }

    /** Settings opens on top of everything and comes back here (scenes draw in list order, hence bringToTop). */
    private openSettings() {
        const data: SettingsSceneData = { returnTo: SceneKey.Pause };
        this.scene.sleep();
        this.scene.launch(SceneKey.Settings, data);
        this.scene.bringToTop(SceneKey.Settings);
    }

    private quitToMap() {
        this.scene.stop(SceneKey.Game); // also stops the HUD
        this.scene.start(SceneKey.Map, {} satisfies MapSceneData);
    }
}
