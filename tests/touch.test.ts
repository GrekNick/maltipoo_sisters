import { describe, it, expect } from 'vitest';
import { HeldPointers, isTouchControlsSetting, sameTouchState, showTouchControls, NO_TOUCH } from '../src/input/touch';

describe('when the on-screen controls show', () => {
    const phone = { coarsePointer: true, touchSeen: false };
    const laptop = { coarsePointer: false, touchSeen: false };
    const touchscreenLaptop = { coarsePointer: false, touchSeen: true };

    it('auto: on phones and tablets, and on any screen once it has been touched', () => {
        expect(showTouchControls('auto', phone)).toBe(true);
        expect(showTouchControls('auto', laptop)).toBe(false);
        expect(showTouchControls('auto', touchscreenLaptop)).toBe(true);
    });

    it('on and off ignore the device', () => {
        expect(showTouchControls('on', laptop)).toBe(true);
        expect(showTouchControls('off', phone)).toBe(false);
    });

    it('only the three choices are valid settings', () => {
        expect(['auto', 'on', 'off', 'maybe', 1, null].map(isTouchControlsSetting)).toEqual([true, true, true, false, false, false]);
    });
});

describe('a button held by fingers', () => {
    it('is held while at least one finger is on it', () => {
        const button = new HeldPointers();
        button.press(1);
        button.press(2);
        button.release(1);
        expect(button.held).toBe(true);
        button.release(2);
        expect(button.held).toBe(false);
    });

    it('ignores fingers it never had, and clears at once', () => {
        const button = new HeldPointers();
        button.release(7);
        expect(button.held).toBe(false);
        button.press(1);
        button.press(1); // the same finger twice (down, then sliding over) still counts once
        button.release(1);
        expect(button.held).toBe(false);
        button.press(3);
        button.clear();
        expect(button.held).toBe(false);
    });
});

describe('touch state', () => {
    it('compares by value', () => {
        expect(sameTouchState(NO_TOUCH, { left: false, right: false, down: false, jump: false })).toBe(true);
        expect(sameTouchState(NO_TOUCH, { ...NO_TOUCH, jump: true })).toBe(false);
    });
});
