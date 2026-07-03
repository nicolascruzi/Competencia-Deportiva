import { apiFetch } from './client';

export const getNotificaciones  = ()   => apiFetch('/notificaciones');
export const markAllRead        = ()   => apiFetch('/notificaciones/read', { method: 'PATCH' });
export const markOneRead        = (id) => apiFetch(`/notificaciones/${id}/read`, { method: 'PATCH' });
