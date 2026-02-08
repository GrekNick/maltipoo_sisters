/**
 * Socket connection config. Use env in production (e.g. VITE_SOCKET_URL).
 * Avoids hardcoded URLs in code.
 */
const SOCKET_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL
    ? import.meta.env.VITE_SOCKET_URL
    : 'http://localhost:3000';

const RECONNECTION_OPTIONS = {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 3
};

export { SOCKET_URL, RECONNECTION_OPTIONS };
