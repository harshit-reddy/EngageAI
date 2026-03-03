/**
 * Backend server URL.
 *
 * In dev the Vite proxy forwards /socket.io, /session, /feedback, /network-info
 * to the Flask backend on port 5000, so we use an empty string (same-origin).
 */
export const SERVER = '';
