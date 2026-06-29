import { apiFetch } from './client';

const BASE = import.meta.env.VITE_API_URL || '/api';

export const getStravaStatus   = ()  => apiFetch('/strava/status');
export const disconnectStrava  = ()  => apiFetch('/strava/disconnect', { method: 'DELETE' });
export const syncStrava        = ()  => apiFetch('/strava/sync', { method: 'POST' });

// Redirige al navegador al endpoint de OAuth (no pasa por apiFetch)
export function connectStrava() {
  const token = localStorage.getItem('nanao_token');
  window.location.href = `${BASE}/strava/connect?token=${token}`;
}
