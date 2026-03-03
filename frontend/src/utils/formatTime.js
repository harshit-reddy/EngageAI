/**
 * Format seconds into MM:SS string.
 */
export function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Format milliseconds into a human-readable duration (e.g. "5s", "2m 30s").
 */
export function formatMs(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
