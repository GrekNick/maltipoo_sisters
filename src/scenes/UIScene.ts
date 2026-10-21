// The HUD and the finish panel, drawn in their own scene on top of GameScene. GameScene doesn't know about any
// of this; it only emits GameEvent.Hud / GameEvent.Finished. Like a view subscribing to a model's events.
// The other way round, taps on HUD buttons go out as UIEvent on this scene's emitter.
import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_KEYS, FRAME_SIZE, type CharacterKey } from '../characters';
import { t } from '../i18n';
import { onTouchDeviceChange, touchDevice } from '../input/device';
import { showTouchControls } from '../input/touch';
import { loadSettings } from '../persistence';
import { Menu } from '../ui/Menu';
import { TouchControls } from '../ui/TouchControls';
import { FONT_FAMILY, GameEvent, SceneKey, TEXT_STYLE, UIEvent, VIEW, type FinishedState, type HudState } from './shared';

const SWAP_BUTTON = { x: VIEW.width - 46, y: 46, radius: 32 } as const;
const PAUSE_BUTTON = { x: VIEW.width - 114, y: 46, radius: 20 } as const;

export class UIScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private positionText!: Phaser.GameObjects.Text;
    private swapButton!: Phaser.GameObjects.Container;
    private pauseButton!: Phaser.GameObjects.Container;
    private swapIcon!: Phaser.GameObjects.Image;
    private character: CharacterKey | null = null;
    private controlsHint!: Phaser.GameObjects.Text;
    private touchControls!: TouchControls;
    private finished = false;

    constructor() {
        super(SceneKey.UI);
    }

    create() {
        this.character = null; // fields survive restarts; the first HUD update sets the swap button's icon
        this.finished = false;
        this.statusText = this.add.text(16, 16, '', TEXT_STYLE);
        this.positionText = this.add.text(16, 38, '', TEXT_STYLE);
        // Keyboard controls along the bottom edge (hidden while the on-screen buttons show)
        this.controlsHint = this.add.text(VIEW.width / 2, VIEW.height - 20,
            t('hud.controls'),
            { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0.5);
        this.createSwapButton();
        this.createPauseButton();
        this.touchControls = new TouchControls(this, state => this.events.emit(UIEvent.Touch, state));
        this.refreshTouchControls();
        const stopWatching = onTouchDeviceChange(() => this.refreshTouchControls());

        const game = this.scene.get(SceneKey.Game);
        game.events.on(GameEvent.Hud, this.updateHud, this);
        game.events.on(GameEvent.Finished, this.showFinishPanel, this);
        // The setting may have changed in Settings (opened from the pause menu)
        game.events.on(Phaser.Scenes.Events.RESUME, this.refreshTouchControls, this);
        this.events.once('shutdown', () => {
            game.events.off(GameEvent.Hud, this.updateHud, this);
            game.events.off(GameEvent.Finished, this.showFinishPanel, this);
            game.events.off(Phaser.Scenes.Events.RESUME, this.refreshTouchControls, this);
            stopWatching();
        });
    }

    /** On-screen buttons per the setting (auto = touch devices); the keyboard hint shows when they don't */
    private refreshTouchControls() {
        const visible = !this.finished && showTouchControls(loadSettings().touchControls, touchDevice());
        this.touchControls.setVisible(visible);
        this.controlsHint.setVisible(!visible && !this.finished);
    }

    /** Top right: a round button showing the other sister; tap it to swap (same as Q/Tab). */
    private createSwapButton() {
        // Character frames are drawn at half size here: their art pixels are 2x2, so at 0.5 each becomes exactly one
        // screen pixel and stays sharp as long as the image sits on whole pixels (origin 0, integer position).
        const { x, y, radius } = SWAP_BUTTON;
        const circle = this.add.circle(0, 0, radius, 0x2c3e50, 0.6).setStrokeStyle(3, 0xffffff);
        this.swapIcon = this.add.image(-Math.round(FRAME_SIZE.width / 4), -Math.round(FRAME_SIZE.height / 4) - 2, CHARACTER_KEYS[0] ?? 'kiwi', 0)
            .setOrigin(0, 0).setScale(0.5);
        const keys = this.add.text(0, radius + 10, 'Q / Tab', { ...TEXT_STYLE, fontSize: '12px' }).setOrigin(0.5);
        this.swapButton = this.add.container(x, y, [circle, this.swapIcon, keys]).setVisible(false);

        circle.setInteractive({ useHandCursor: true });
        circle.on('pointerover', () => circle.setFillStyle(0x2c3e50, 0.85));
        circle.on('pointerout', () => circle.setFillStyle(0x2c3e50, 0.6));
        circle.on('pointerdown', () => this.events.emit(UIEvent.Swap));
    }

    /** Next to the swap button: pause (same as Esc/P), for touch screens */
    private createPauseButton() {
        const { x, y, radius } = PAUSE_BUTTON;
        const circle = this.add.circle(0, 0, radius, 0x2c3e50, 0.6).setStrokeStyle(3, 0xffffff);
        const bars = [-5, 5].map(dx => this.add.rectangle(dx, 0, 6, 18, 0xffffff));
        this.pauseButton = this.add.container(x, y, [circle, ...bars]);

        circle.setInteractive({ useHandCursor: true });
        circle.on('pointerover', () => circle.setFillStyle(0x2c3e50, 0.85));
        circle.on('pointerout', () => circle.setFillStyle(0x2c3e50, 0.6));
        circle.on('pointerdown', () => {
            circle.setFillStyle(0x2c3e50, 0.6); // the pause menu covers it, so pointerout won't come
            this.events.emit(UIEvent.Pause);
        });
    }

    private updateHud({ character, seconds, falls, treats, totalTreats, x, y }: HudState) {
        if (character !== this.character) {
            this.character = character;
            const other = CHARACTER_KEYS.find(key => key !== character) ?? character;
            this.swapIcon.setTexture(other, 0);
            this.touchControls.setDuckAvailable(CHARACTERS[character].crouchHitbox !== null);
            this.swapButton.setVisible(true);
        }
        const parts = [CHARACTERS[character].name, t('hud.time', { seconds: seconds.toFixed(1) }), t('hud.falls', { falls })];
        if (totalTreats > 0) parts.push(t('hud.treats', { treats, total: totalTreats }));
        this.statusText.setText(parts.join('   '));
        this.positionText.setText(t('hud.position', { x: Math.floor(x), y: Math.floor(y) }));
    }

    private showFinishPanel({ seconds, falls, treats, totalTreats, best }: FinishedState) {
        this.swapButton.setVisible(false);
        this.pauseButton.setVisible(false);
        this.finished = true;
        this.refreshTouchControls();
        const x = VIEW.width / 2;
        const text = (y: number, content: string, size: number, color = '#ffffff') =>
            this.add.text(x, y, content, {
                fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, stroke: '#2c3e50', strokeThickness: 4,
            }).setOrigin(0.5);

        this.add.rectangle(x, 250, 460, 300, 0x2c3e50, 0.85).setStrokeStyle(3, 0xffffff);
        text(145, t('finish.title'), 34);
        const parts = [t('hud.time', { seconds: seconds.toFixed(1) }), t('hud.falls', { falls })];
        if (totalTreats > 0) parts.push(t('hud.treats', { treats, total: totalTreats }));
        text(192, parts.join('    '), 20);
        if (best) {
            text(224, best.isNew ? t('finish.newBest') : t('finish.best', { seconds: best.seconds.toFixed(1) }), 18,
                best.isNew ? '#ffe082' : '#cfd8dc');
        }
        // Buttons after the dog has trotted in, so a jump key still held at the finish doesn't press one
        this.time.delayedCall(600, () => new Menu(this, x, 280, [
            { label: t('finish.toMap'), onSelect: () => this.events.emit(UIEvent.ToMap) },
            { label: t('finish.replay'), onSelect: () => this.events.emit(UIEvent.Replay) },
        ], 240));
    }
}
