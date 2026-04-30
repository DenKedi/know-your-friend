// Centralized API/WS base URL resolution.
// In production (Cloudflare Pages), set VITE_API_BASE_URL to the backend
// origin (e.g. https://know-your-friend-a1d1f77f8821.herokuapp.com).
// In dev it defaults to "" so the Vite proxy handles /api and /ws.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const API_ORIGIN = RAW_BASE.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${p}`;
}

export function wsUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (API_ORIGIN) {
    const wsOrigin = API_ORIGIN.replace(/^http/, "ws");
    return `${wsOrigin}${p}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${p}`;
}

export const API_BASE_URL = API_ORIGIN;
