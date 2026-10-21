// On-screen buttons for touch screens: ◀ ▶ bottom left, jump and duck bottom right (swap and pause are the round
// HUD buttons at the top). Several fingers at once (move + jump); sliding a thumb between ◀ and ▶ works.
// Reports a TouchState whenever it changes; the rules live in src/input/touch.ts.
import Phaser from 'phaser';
import { HeldPointers, NO_TOUCH, sameTouchState, type TouchState } from '../input/touch';

type Action = keyof TouchState;

interface ButtonSpec {
    action: Action;
    x: number;
    y: number;
    radius: number;
    /** Triangle corners, relative to the button's centre */
    arrow: [number, number, number, number, number, number];
}

// Positions in the 800x600 view. Big enough for a child's thumb once the game is scaled down on a phone.
const BUTTONS: readonly ButtonSpec[] = [
    { action: 'left', x: 72, y: 516, radius: 46, arrow: [10, -16, 10, 16, -14, 0] },
    { action: 'right', x: 182, y: 516, radius: 46, arrow: [-10, -16, -10, 16, 14, 0] },
    { action: 'jump', x: 724, y: 500, radius: 54, arrow: [-18, 10, 18, 10, 0, -16] },
    { action: 'down', x: 608, y: 532, radius: 40, arrow: [-14, -8, 14, -8, 0, 12] },
];
/** Extra reach around each circle for fingers that land a little off */
const SLOP = 14;
const ALPHA = { idle: 0.3, held: 0.6 } as const;

interface Button {
    spec: ButtonSpec;
    fingers: HeldPointers;
    container: Phaser.GameObjects.Container;
    circle: Phaser.GameObjects.Arc;
}

export class TouchControls {
    private readonly buttons: Button[];
    private state: TouchState = NO_TOUCH;

    constructor(private readonly scene: Phaser.Scene, private readonly onChange: (state: TouchState) => void) {
        this.buttons = BUTTONS.map(spec => this.createButton(spec));
        // A finger lifted anywhere (even off the button, or over the pause menu) lets go of whatever it held
        scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => this.release(pointer.id));
        scene.input.on(Phaser.Input.Events.GAME_OUT, () => this.releaseAll());
    }

    setVisible(visible: boolean): void {
        this.buttons.forEach(button => button.container.setVisible(visible));
        if (!visible) this.releaseAll();
    }

    /** The duck button only shows for a sister who can duck */
    setDuckAvailable(available: boolean): void {
        const duck = this.buttons.find(button => button.spec.action === 'down');
        if (!duck) return;
        if (duck.circle.input) duck.circle.input.enabled = available;
        duck.container.setAlpha(available ? 1 : 0);
        if (!available) {
            duck.fingers.clear();
            this.update();
        }
    }

    releaseAll(): void {
        this.buttons.forEach(button => button.fingers.clear());
        this.update();
    }

    private createButton(spec: ButtonSpec): Button {
        const { radius, arrow } = spec;
        const circle = this.scene.add.circle(0, 0, radius, 0xffffff, ALPHA.idle).setStrokeStyle(3, 0xffffff, 0.8);
        const [x1, y1, x2, y2, x3, y3] = arrow;
        const icon = this.scene.add.graphics().fillStyle(0x2c3e50, 0.85).fillTriangle(x1, y1, x2, y2, x3, y3);
        const container = this.scene.add.container(spec.x, spec.y, [circle, icon]).setVisible(false);
        const button: Button = { spec, fingers: new HeldPointers(), container, circle };

        // Hit area in the circle's own coordinates (its top-left is 0,0), a bit larger than what's drawn
        circle.setInteractive(new Phaser.Geom.Circle(radius, radius, radius + SLOP), Phaser.Geom.Circle.Contains);
        circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.press(button, pointer.id));
        // Sliding a finger onto or off the button while it's down
        circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) this.press(button, pointer.id);
        });
        circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (pointer: Phaser.Input.Pointer) => {
            button.fingers.release(pointer.id);
            this.update();
        });
        return button;
    }

    private press(button: Button, pointerId: number) {
        button.fingers.press(pointerId);
        this.update();
    }

    private release(pointerId: number) {
        this.buttons.forEach(button => button.fingers.release(pointerId));
        this.update();
    }

    private update() {
        const held = (action: Action) => this.buttons.some(b => b.spec.action === action && b.fingers.held);
        const state: TouchState = { left: held('left'), right: held('right'), down: held('down'), jump: held('jump') };
        this.buttons.forEach(button => {
            const isHeld = button.fingers.held;
            button.circle.setFillStyle(0xffffff, isHeld ? ALPHA.held : ALPHA.idle);
            button.container.setScale(isHeld ? 0.94 : 1);
        });
        if (sameTouchState(state, this.state)) return;
        this.state = state;
        this.onChange(state);
    }
}
