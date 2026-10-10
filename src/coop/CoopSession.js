import { io } from 'socket.io-client';
import { SPRITE_SCALE } from '../characters.js';

const SERVER_URL = import.meta.env.VITE_COOP_SERVER_URL || 'http://localhost:3000';

/**
 * Online co-op prototype (parked, enabled only with VITE_COOP=true).
 *
 * Relays the local player's state to server/coop-server.js and mirrors other
 * players as plain (non-physics) sprites. The scene talks to it only through
 * update() and requestCharacterChange(); it calls back into scene.switchCharacter().
 */
export class CoopSession {
    constructor(scene) {
        this.scene = scene;
        this.otherPlayers = {};
        this.lastSentState = null;
        this.socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3
        });
        this.registerHandlers();
    }

    registerHandlers() {
        const { socket, scene } = this;

        socket.on('connect', () => console.log('[coop] connected to', SERVER_URL));
        socket.on('connect_error', (error) => console.log('[coop] connection error:', error.message));

        // The server picks a free character for us; the local player already exists, so just switch.
        socket.on('characterAssigned', ({ character }) => {
            scene.switchCharacter(character);
        });

        socket.on('currentPlayers', (players) => {
            Object.values(players).forEach((info) => {
                if (info.id !== socket.id) this.addOtherPlayer(info);
            });
            this.updateSelectLock();
        });

        socket.on('newPlayer', (info) => {
            this.addOtherPlayer(info);
            this.updateSelectLock();
        });

        socket.on('playerMoved', (info) => {
            const sprite = this.otherPlayers[info.id];
            if (!sprite) return;
            sprite.setPosition(info.x, info.y);
            sprite.setFlipX(info.flipX);
            sprite.anims.play(`${sprite.character}_${info.animation}`, true);
        });

        socket.on('playerCharacterChanged', ({ id, character }) => {
            const sprite = this.otherPlayers[id];
            if (!sprite) return;
            sprite.character = character;
            sprite.anims.play(`${character}_idle`);
        });

        socket.on('characterChangeRejected', ({ message, assignedCharacter }) => {
            console.warn('[coop]', message);
            scene.switchCharacter(assignedCharacter);
        });

        socket.on('playerDisconnected', (id) => {
            this.otherPlayers[id]?.destroy();
            delete this.otherPlayers[id];
            this.updateSelectLock();
        });
    }

    addOtherPlayer(info) {
        const sprite = this.scene.add.sprite(info.x, info.y, info.character, 0);
        sprite.setScale(SPRITE_SCALE);
        sprite.setOrigin(0.5, 1); // positions are feet, same as the local player
        sprite.setFlipX(info.flipX);
        sprite.character = info.character;
        this.otherPlayers[info.id] = sprite;
    }

    // The scene restarts (R / finishing the level) create a new session, so drop the old socket.
    destroy() {
        this.socket.disconnect();
        this.otherPlayers = {};
    }

    requestCharacterChange(character) {
        this.scene.switchCharacter(character);
        this.socket.emit('characterChange', { character });
    }

    // Character switching is only allowed while playing alone.
    updateSelectLock() {
        const select = document.getElementById('character-select');
        if (!select) return;
        const multiplayer = Object.keys(this.otherPlayers).length > 0;
        select.disabled = multiplayer;
        select.title = multiplayer ? 'Character selection disabled in multiplayer mode' : 'Select your character';
    }

    // Called every frame by the scene; only sends when the local state actually changed.
    update() {
        const { player, currentAnimation } = this.scene;
        const state = {
            x: Math.round(player.x),
            y: Math.round(player.y),
            flipX: player.flipX,
            animation: currentAnimation
        };
        const last = this.lastSentState;
        if (last && last.x === state.x && last.y === state.y &&
            last.flipX === state.flipX && last.animation === state.animation) {
            return;
        }
        this.socket.emit('playerMovement', state);
        this.lastSentState = state;
    }
}
