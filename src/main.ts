// Entry point: game config + scene list, and the character dropdown next to the canvas.
// Scenes (like routes): Preload → Title ⇄ Settings, Title → Game (+ UI on top) → Esc back to Title.
import Phaser from 'phaser';
import { isCharacterKey } from './characters';
import { displayScale } from './display';
import { PHYSICS } from './physics';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { SceneKey, VIEW } from './scenes/shared';

declare global {
    interface Window {
        /** Exposed in dev builds for console debugging (see AGENTS.md) */
        game?: Phaser.Game;
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: VIEW.width,
    height: VIEW.height,
    parent: 'game-container',
    roundPixels: true, // avoids shimmering seams while the camera scrolls
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: PHYSICS.gravity },
            debug: false
        }
    },
    // The first scene in the list starts automatically
    scene: [PreloadScene, TitleScene, SettingsScene, GameScene, UIScene],
};

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

// The character dropdown next to the canvas: switches the dog in play, or picks the one to start with.
// (Temporary: swapping sisters in-game replaces it in roadmap M4.)
window.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('character-select');
    if (!(select instanceof HTMLSelectElement)) return;
    select.addEventListener('change', () => {
        const character = select.value;
        const scene = game.scene.getScene<GameScene>(SceneKey.Game);
        if (!scene || !isCharacterKey(character)) return;
        if (!game.scene.isActive(SceneKey.Game)) {
            scene.currentCharacter = character;
        } else if (scene.coop) {
            scene.coop.requestCharacterChange(character);
        } else {
            scene.switchCharacter(character);
        }
    });
});
