import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
}
// Small fetch wrapper: returns parsed JSON, or throws an ApiError with a readable message.
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_BASE_URL}. Is FastAPI running (uvicorn)?`, 0);
  }
  if (!res.ok) {
    let msg = `Request failed (HTTP ${res.status})`;
    try { const j = await res.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* keep default */ }
    throw new ApiError(msg, res.status);
  }
  return res.json();
}
