// The HUD and the finish panel, drawn in their own scene on top of GameScene. GameScene doesn't know about any
// of this; it only emits GameEvent.Hud / GameEvent.Finished. Like a view subscribing to a model's events.
import Phaser from 'phaser';
import { GameEvent, SceneKey, TEXT_STYLE, VIEW, type FinishedState, type HudState } from './shared';

export class UIScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private positionText!: Phaser.GameObjects.Text;

    constructor() {
        super(SceneKey.UI);
    }

    create() {
        this.statusText = this.add.text(16, 16, '', TEXT_STYLE);
        this.positionText = this.add.text(16, 38, '', TEXT_STYLE);
        // Controls along the bottom edge, where they don't collide with the character dropdown (top right)
        this.add.text(VIEW.width / 2, VIEW.height - 20,
            'Move ←/→ or A/D · Jump ↑/W/Space · Duck ↓/S (Sofi) · R restart · Esc menu · H hitboxes',
            { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0.5);

        const game = this.scene.get(SceneKey.Game);
        game.events.on(GameEvent.Hud, this.updateHud, this);
        game.events.on(GameEvent.Finished, this.showFinishPanel, this);
        this.events.once('shutdown', () => {
            game.events.off(GameEvent.Hud, this.updateHud, this);
            game.events.off(GameEvent.Finished, this.showFinishPanel, this);
        });
    }

    private updateHud({ characterName, seconds, falls, treats, totalTreats, x, y }: HudState) {
        const treatText = totalTreats > 0 ? `   Treats: ${treats}/${totalTreats}` : '';
        this.statusText.setText(`${characterName}   Time: ${seconds.toFixed(1)}s   Falls: ${falls}${treatText}`);
        this.positionText.setText(`Позиція: X: ${Math.floor(x)}, Y: ${Math.floor(y)}`);
    }

    private showFinishPanel({ seconds, falls, treats, totalTreats, best }: FinishedState) {
        const x = VIEW.width / 2;
        const y = 210;
        const text = (dy: number, content: string, size: number, color = '#ffffff') =>
            this.add.text(x, y + dy, content, {
                fontSize: `${size}px`, color, stroke: '#2c3e50', strokeThickness: 4,
            }).setOrigin(0.5);

        this.add.rectangle(x, y, 440, 190, 0x2c3e50, 0.85).setStrokeStyle(3, 0xffffff);
        text(-55, 'Home sweet home!', 34);
        const treatText = totalTreats > 0 ? `    Treats: ${treats}/${totalTreats}` : '';
        text(-8, `Time: ${seconds.toFixed(1)}s    Falls: ${falls}${treatText}`, 20);
        if (best) {
            text(24, best.isNew ? 'New best time!' : `Best: ${best.seconds.toFixed(1)}s`, 18,
                best.isNew ? '#ffe082' : '#cfd8dc');
        }
        text(62, 'R: play again    Esc: menu', 18, '#ffe082');
    }
}
