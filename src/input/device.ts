// What kind of screen the game runs on, for the "auto" on-screen controls (src/input/touch.ts). Watches the page:
// a coarse main pointer (phones, tablets) or the first real touch switches the buttons on.
import type { TouchDevice } from './touch';

const COARSE = '(pointer: coarse)';
let touchSeen = false;
const listeners = new Set<() => void>();

function coarsePointer(): boolean {
    return typeof matchMedia === 'function' && matchMedia(COARSE).matches;
}

export function touchDevice(): TouchDevice {
    return { coarsePointer: coarsePointer(), touchSeen };
}

/** Called when the answer may have changed (first touch, or the main pointer changed). Returns unsubscribe. */
export function onTouchDeviceChange(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Starts watching; call once from main.ts. */
export function watchTouchDevice(): void {
    const notify = () => listeners.forEach(listener => listener());
    // Capture phase, so it runs before Phaser handles the same touch
    window.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch' || touchSeen) return;
        touchSeen = true;
        notify();
    }, { capture: true, passive: true });
    if (typeof matchMedia === 'function') matchMedia(COARSE).addEventListener('change', notify);
}
