import { apiFetch } from './client';

export const login    = (email, password)          => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (nombre, email, password)  => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ nombre, email, password }) });
export const me       = ()                         => apiFetch('/auth/me');
