import { io, type Socket } from 'socket.io-client';
import { SPRITE_SCALE, isCharacterKey, type AnimationState, type CharacterKey } from '../characters';

const SERVER_URL: string = import.meta.env.VITE_COOP_SERVER_URL || 'http://localhost:3000';

/** What the co-op session needs from the scene; keeps the dependency narrow. */
export interface CoopHost {
    readonly add: Phaser.GameObjects.GameObjectFactory;
    readonly player: Phaser.GameObjects.Sprite;
    readonly currentAnimation: AnimationState;
    switchCharacter(character: CharacterKey): void;
}

interface MovementState {
    x: number;
    y: number;
    flipX: boolean;
    animation: AnimationState;
}

interface PlayerInfo extends MovementState {
    id: string;
    character: CharacterKey;
}

// Message shapes shared with server/coop-server.js
interface ServerToClientEvents {
    characterAssigned(data: { character: CharacterKey }): void;
    currentPlayers(players: Record<string, PlayerInfo>): void;
    newPlayer(info: PlayerInfo): void;
    playerMoved(info: MovementState & { id: string }): void;
    playerCharacterChanged(data: { id: string; character: CharacterKey }): void;
    characterChangeRejected(data: { message: string; assignedCharacter: CharacterKey }): void;
    playerDisconnected(id: string): void;
}

interface ClientToServerEvents {
    playerMovement(state: MovementState): void;
    characterChange(data: { character: CharacterKey }): void;
}

interface RemotePlayer {
    sprite: Phaser.GameObjects.Sprite;
    character: CharacterKey;
}

/**
 * Online co-op prototype (parked, enabled only with VITE_COOP=true).
 *
 * Relays the local player's state to server/coop-server.js and mirrors other
 * players as plain (non-physics) sprites. The scene talks to it only through
 * update() and requestCharacterChange(); it calls back into host.switchCharacter().
 */
export class CoopSession {
    private readonly otherPlayers = new Map<string, RemotePlayer>();
    private lastSentState: MovementState | null = null;
    private readonly socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    constructor(private readonly host: CoopHost) {
        this.socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3
        });
        this.registerHandlers();
    }

    private registerHandlers(): void {
        const { socket, host } = this;

        socket.on('connect', () => console.log('[coop] connected to', SERVER_URL));
        socket.on('connect_error', (error) => console.log('[coop] connection error:', error.message));

        // The server picks a free character for us; the local player already exists, so just switch.
        socket.on('characterAssigned', ({ character }) => {
            if (isCharacterKey(character)) host.switchCharacter(character);
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
            const remote = this.otherPlayers.get(info.id);
            if (!remote) return;
            remote.sprite.setPosition(info.x, info.y);
            remote.sprite.setFlipX(info.flipX);
            remote.sprite.anims.play(`${remote.character}_${info.animation}`, true);
        });

        socket.on('playerCharacterChanged', ({ id, character }) => {
            const remote = this.otherPlayers.get(id);
            if (!remote || !isCharacterKey(character)) return;
            remote.character = character;
            remote.sprite.anims.play(`${character}_idle`);
        });

        socket.on('characterChangeRejected', ({ message, assignedCharacter }) => {
            console.warn('[coop]', message);
            if (isCharacterKey(assignedCharacter)) host.switchCharacter(assignedCharacter);
        });

        socket.on('playerDisconnected', (id) => {
            this.otherPlayers.get(id)?.sprite.destroy();
            this.otherPlayers.delete(id);
            this.updateSelectLock();
        });
    }

    private addOtherPlayer(info: PlayerInfo): void {
        // Data from the network is untrusted; ignore characters we don't know
        if (!isCharacterKey(info.character)) return;
        const sprite = this.host.add.sprite(info.x, info.y, info.character, 0);
        sprite.setScale(SPRITE_SCALE);
        sprite.setOrigin(0.5, 1); // positions are feet, same as the local player
        sprite.vertexRoundMode = 'fullAuto'; // pixel-sharp when flipped, same as the local player
        sprite.setFlipX(info.flipX);
        this.otherPlayers.set(info.id, { sprite, character: info.character });
    }

    // The scene restarts (R / finishing the level) create a new session, so drop the old socket.
    destroy(): void {
        this.socket.disconnect();
        this.otherPlayers.clear();
    }

    requestCharacterChange(character: CharacterKey): void {
        this.host.switchCharacter(character);
        this.socket.emit('characterChange', { character });
    }

    // Character switching is only allowed while playing alone.
    private updateSelectLock(): void {
        const select = document.getElementById('character-select');
        if (!(select instanceof HTMLSelectElement)) return;
        const multiplayer = this.otherPlayers.size > 0;
        select.disabled = multiplayer;
        select.title = multiplayer ? 'Character selection disabled in multiplayer mode' : 'Select your character';
    }

    // Called every frame by the scene; only sends when the local state actually changed.
    update(): void {
        const { player, currentAnimation } = this.host;
        const state: MovementState = {
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
