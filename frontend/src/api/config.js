import { apiFetch } from './client';

export const getConfig   = ()      => apiFetch('/config');
export const saveConfig  = (body)  => apiFetch('/config', { method: 'PUT', body: JSON.stringify(body) });
