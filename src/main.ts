// Entry point: game config + scene list, translated page text, and fitting the canvas to the window.
// Scenes (like routes): Preload → Title ⇄ Settings, Title → Map → Game (+ UI on top) ⇄ Pause (→ Settings, or → Map);
// finishing a level goes back to the Map.
import Phaser from 'phaser';
import { displayScale } from './display';
import { watchTouchDevice } from './input/device';
import { detectLanguage, getLanguage, onLanguageChange, setLanguage, t, type MessageKey } from './i18n';
import { loadSettings } from './persistence';
import { PHYSICS } from './physics';
import { GameScene } from './scenes/GameScene';
import { MapScene } from './scenes/MapScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { VIEW } from './scenes/shared';

declare global {
    interface Window {
        /** Exposed in dev builds for console debugging (see AGENTS.md) */
        game?: Phaser.Game;
    }
}

// Language: the one chosen in Settings, otherwise the browser's (if we have it), otherwise English
setLanguage(loadSettings().language ?? detectLanguage(navigator.languages ?? [navigator.language]));

// Text on the page outside the canvas: elements carry data-i18n="<message key>"
function translatePage() {
    document.documentElement.lang = getLanguage();
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
        element.textContent = t(element.dataset.i18n as MessageKey);
    });
}
translatePage();
onLanguageChange(translatePage);

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: VIEW.width,
    height: VIEW.height,
    parent: 'game-container',
    roundPixels: true, // avoids shimmering seams while the camera scrolls
    // Up to 3 fingers at once (move + jump + swap); Phaser tracks one by default
    input: { activePointers: 3 },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: PHYSICS.gravity },
            debug: false
        }
    },
    // The first scene in the list starts automatically
    scene: [PreloadScene, TitleScene, SettingsScene, MapScene, GameScene, UIScene, PauseScene],
};

watchTouchDevice(); // for the "auto" on-screen controls

const game = new Phaser.Game(config);

// Fill the window (src/display.ts picks the size). Phaser's scale mode stays NONE: we size the canvas with CSS, then
// refresh() makes Phaser re-measure it so clicks and taps still map to the right game coordinates.
function fitToScreen() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const scale = displayScale({ width: container.clientWidth, height: container.clientHeight }, VIEW, window.devicePixelRatio);
    game.canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
    game.canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
    game.scale.refresh();
}
game.events.once(Phaser.Core.Events.READY, () => {
    fitToScreen();
    // Window resizes, rotation, the controls line showing or hiding, browser zoom (it changes devicePixelRatio)
    const container = document.getElementById('game-container');
    if (container) new ResizeObserver(fitToScreen).observe(container);
    window.addEventListener('resize', fitToScreen);
});

// Handy for poking at the game from the browser console during development
if (import.meta.env.DEV) window.game = game;
