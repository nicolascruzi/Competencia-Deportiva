import { apiFetch } from './client';

export const getAdminStats        = ()           => apiFetch('/admin/stats');
export const getAdminUsers        = ()           => apiFetch('/admin/users');
export const updateAdminUser      = (id, body)   => apiFetch(`/admin/users/${id}`,        { method: 'PUT',    body: JSON.stringify(body) });
export const deleteAdminUser      = (id)         => apiFetch(`/admin/users/${id}`,        { method: 'DELETE' });
export const getAdminCompetencias = ()           => apiFetch('/admin/competencias');
export const deleteAdminCompetencia = (id)       => apiFetch(`/admin/competencias/${id}`, { method: 'DELETE' });
export const getAdminActividades  = ()           => apiFetch('/admin/actividades');
export const deleteAdminActividad = (id)         => apiFetch(`/admin/actividades/${id}`,  { method: 'DELETE' });
export const getAdminDeportes     = ()           => apiFetch('/admin/deportes');
export const updateAdminDeporte   = (id, body)   => apiFetch(`/admin/deportes/${id}`,     { method: 'PUT',    body: JSON.stringify(body) });
export const deleteAdminDeporte   = (id)         => apiFetch(`/admin/deportes/${id}`,     { method: 'DELETE' });
