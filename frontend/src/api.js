/**
 * Backend server URL — computed at runtime from the browser's current hostname.
 *
 * Using window.location.hostname means:
 *   - Host opens http://localhost:3000       -> SERVER = http://localhost:4000
 *   - Participant opens http://192.168.1.100:3000 -> SERVER = http://192.168.1.100:4000
 *
 * This lets participants on other laptops reach the backend with zero config.
 */
export const SERVER = `${window.location.protocol}//${window.location.hostname}:4000`;
