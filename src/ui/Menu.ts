// A vertical list of buttons that works with mouse, touch and keyboard (↑/↓ or W/S to choose, Enter/Space to
// press). One button is always "focused" (highlighted), so it also works without a pointer.
import Phaser from 'phaser';
import { FONT_FAMILY } from '../scenes/shared';

export interface MenuItem {
    label: string;
    onSelect?: () => void;
    /** Disabled items are shown dimmed and skipped (e.g. "coming soon") */
    enabled?: boolean;
}

interface Button {
    item: MenuItem;
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;
}

const HEIGHT = 52;
const GAP = 14;
const COLORS = { idle: 0x2c3e50, focused: 0xf2994a, border: 0xffffff } as const;

export class Menu {
    private readonly buttons: Button[] = [];
    private focused = -1;

    /** `x`, `y` = centre of the first button */
    constructor(private readonly scene: Phaser.Scene, x: number, y: number, items: MenuItem[], width = 260) {
        items.forEach((item, index) => {
            const buttonY = y + index * (HEIGHT + GAP);
            const background = scene.add.rectangle(x, buttonY, width, HEIGHT, COLORS.idle)
                .setRounded(14)
                .setStrokeStyle(3, COLORS.border);
            const text = scene.add.text(x, buttonY, item.label, {
                fontFamily: FONT_FAMILY, fontSize: '24px', color: '#ffffff', stroke: '#1b2631', strokeThickness: 4,
            }).setOrigin(0.5);

            if (this.isEnabled(item)) {
                background.setInteractive({ useHandCursor: true });
                background.on('pointerover', () => this.focus(index));
                background.on('pointerup', () => this.select(index));
            } else {
                background.setAlpha(0.45);
                text.setAlpha(0.6);
            }
            this.buttons.push({ item, background, text });
        });

        const keyboard = scene.input.keyboard;
        keyboard?.on('keydown-UP', () => this.move(-1));
        keyboard?.on('keydown-W', () => this.move(-1));
        keyboard?.on('keydown-DOWN', () => this.move(1));
        keyboard?.on('keydown-S', () => this.move(1));
        keyboard?.on('keydown-ENTER', () => this.select(this.focused));
        keyboard?.on('keydown-SPACE', () => this.select(this.focused));

        this.focus(this.buttons.findIndex(b => this.isEnabled(b.item)));
    }

    setLabel(index: number, label: string): void {
        const button = this.buttons[index];
        if (!button) return;
        button.item.label = label;
        button.text.setText(label);
    }

    private isEnabled(item: MenuItem): boolean {
        return item.enabled !== false;
    }

    private move(step: 1 | -1): void {
        const count = this.buttons.length;
        for (let i = 1; i <= count; i++) {
            const index = (this.focused + step * i + count) % count;
            const button = this.buttons[index];
            if (button && this.isEnabled(button.item)) return this.focus(index);
        }
    }

    private focus(index: number): void {
        this.focused = index;
        this.buttons.forEach((button, i) => {
            if (!this.isEnabled(button.item)) return;
            const focused = i === index;
            button.background.setFillStyle(focused ? COLORS.focused : COLORS.idle);
            button.background.setScale(focused ? 1.05 : 1);
            button.text.setScale(focused ? 1.05 : 1);
        });
    }

    private select(index: number): void {
        const button = this.buttons[index];
        if (!button || !this.isEnabled(button.item)) return;
        this.focus(index);
        // A short press animation, then the action
        this.scene.tweens.add({
            targets: [button.background, button.text],
            scale: 0.95,
            duration: 60,
            yoyo: true,
            onComplete: () => button.item.onSelect?.(),
        });
    }
}
