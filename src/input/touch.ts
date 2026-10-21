// On-screen (touch) controls as pure rules: when to show them, and which buttons are held. The Phaser side is
// src/ui/TouchControls.ts; tests are in tests/touch.test.ts.

/** Settings choice. "auto" shows the buttons on touch devices, or once the screen has been touched. */
export type TouchControlsSetting = 'auto' | 'on' | 'off';

/** In the order Settings cycles through them */
export const TOUCH_CONTROLS_SETTINGS: readonly TouchControlsSetting[] = ['auto', 'on', 'off'];

export function isTouchControlsSetting(value: unknown): value is TouchControlsSetting {
    return typeof value === 'string' && (TOUCH_CONTROLS_SETTINGS as readonly string[]).includes(value);
}

export interface TouchDevice {
    /** The main pointer is a finger (phones, tablets): CSS `(pointer: coarse)` */
    readonly coarsePointer: boolean;
    /** The screen has been touched during this visit (e.g. a laptop with a touchscreen) */
    readonly touchSeen: boolean;
}

export function showTouchControls(setting: TouchControlsSetting, device: TouchDevice): boolean {
    if (setting === 'on') return true;
    if (setting === 'off') return false;
    return device.coarsePointer || device.touchSeen;
}

/** What the on-screen buttons are asking for; GameScene merges it with the keyboard. */
export interface TouchState {
    readonly left: boolean;
    readonly right: boolean;
    readonly down: boolean;
    readonly jump: boolean;
}

export const NO_TOUCH: TouchState = { left: false, right: false, down: false, jump: false };

export function sameTouchState(a: TouchState, b: TouchState): boolean {
    return a.left === b.left && a.right === b.right && a.down === b.down && a.jump === b.jump;
}

/**
 * The fingers (pointer ids) on one button. It's held while at least one finger is on it, so sliding a thumb from ◀
 * onto ▶ hands over cleanly, and a second finger elsewhere doesn't release it.
 */
export class HeldPointers {
    private readonly ids = new Set<number>();

    press(id: number): void {
        this.ids.add(id);
    }

    release(id: number): void {
        this.ids.delete(id);
    }

    clear(): void {
        this.ids.clear();
    }

    get held(): boolean {
        return this.ids.size > 0;
    }
}
