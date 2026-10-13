import { apiFetch } from './client';

export const login    = (email, password)          => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (nombre, apellido, email, password) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ nombre, apellido, email, password }) });
export const me       = ()                         => apiFetch('/auth/me');
export const forgotPassword = (email)              => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const changePassword = (passwordActual, passwordNueva) => apiFetch('/auth/change-password', { method: 'PUT', body: JSON.stringify({ passwordActual, passwordNueva }) });
