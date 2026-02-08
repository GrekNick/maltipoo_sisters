import { io } from 'socket.io-client';
import { SOCKET_URL, RECONNECTION_OPTIONS } from './networkConfig.js';

/** Event names used by server/client (single source of truth, no magic strings). */
export const SocketEvents = {
    CONNECT: 'connect',
    CONNECT_ERROR: 'connect_error',
    CHARACTER_ASSIGNED: 'characterAssigned',
    CURRENT_PLAYERS: 'currentPlayers',
    NEW_PLAYER: 'newPlayer',
    PLAYER_MOVED: 'playerMoved',
    PLAYER_DISCONNECTED: 'playerDisconnected',
    CHARACTER_CHANGE_REJECTED: 'characterChangeRejected',
    PLAYER_CHARACTER_CHANGED: 'playerCharacterChanged',
    // Emits from client
    PLAYER_MOVEMENT: 'playerMovement',
    CHARACTER_CHANGE: 'characterChange'
};

/**
 * Wraps socket.io connection. Scene registers handlers via on() and sends via emit().
 * No Phaser or game logic here.
 */
export class NetworkManager {
    constructor(url = SOCKET_URL, options = RECONNECTION_OPTIONS) {
        this._url = url;
        this._options = options;
        this._socket = null;
        this._handlers = [];
    }

    connect() {
        if (this._socket?.connected) return this._socket;
        this._socket = io(this._url, this._options);
        this._handlers.forEach(({ event, callback }) => this._socket.on(event, callback));
        this._handlers = [];
        return this._socket;
    }

    disconnect() {
        if (this._socket) {
            this._socket.disconnect();
            this._socket = null;
        }
    }

    on(event, callback) {
        if (this._socket) {
            this._socket.on(event, callback);
        } else {
            this._handlers.push({ event, callback });
        }
    }

    emit(event, data) {
        if (this._socket?.connected) {
            this._socket.emit(event, data);
        }
    }

    get socket() {
        return this._socket;
    }

    get id() {
        return this._socket?.id ?? null;
    }

    get isConnected() {
        return this._socket?.connected ?? false;
    }
}
