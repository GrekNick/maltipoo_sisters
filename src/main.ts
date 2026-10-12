// Entry point: game config + scene list, and the character dropdown next to the canvas.
// Scenes (like routes): Preload → Game (+ UI on top).
import Phaser from 'phaser';
import { isCharacterKey } from './characters';
import { PHYSICS } from './physics';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
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
    scene: [PreloadScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

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
