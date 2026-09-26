import { getTelegramInitData } from "./telegram";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const initData = getTelegramInitData();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (initData) headers.set("X-Telegram-Init-Data", initData);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request_failed_${res.status}`);
  }
  return res.json();
}
