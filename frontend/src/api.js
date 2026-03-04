import axios from 'axios';

/**
 * Backend server URL.
 *
 * Set VITE_API_URL in .env (or Render environment variables) to your
 * backend URL, e.g. "https://engageai-backend.onrender.com"
 *
 * In local dev the Vite proxy handles it, so leave it empty.
 */
export const SERVER = import.meta.env.VITE_API_URL || '';

/* ── JWT token helpers ─────────────────────────────────────── */
const TOKEN_KEY = 'engageai_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Axios instance that auto-attaches the admin JWT token.
 * Use this for any request that requires admin auth.
 */
export const authAxios = axios.create();
authAxios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
