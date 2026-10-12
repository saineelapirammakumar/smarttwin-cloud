// Backend address. Set VITE_API_BASE_URL in a .env file to change it (see .env.example).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
