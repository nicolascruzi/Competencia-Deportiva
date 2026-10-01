import { apiFetch } from './client';

export const getAdminStats        = ()           => apiFetch('/admin/stats');
export const getAdminUsers        = ()           => apiFetch('/admin/users');
export const updateAdminUser      = (id, body)   => apiFetch(`/admin/users/${id}`,        { method: 'PUT',    body: JSON.stringify(body) });
export const deleteAdminUser      = (id)         => apiFetch(`/admin/users/${id}`,        { method: 'DELETE' });
export const getAdminGrupos       = ()           => apiFetch('/admin/grupos');
export const deleteAdminGrupo     = (id)         => apiFetch(`/admin/grupos/${id}`,       { method: 'DELETE' });
export const getAdminActividades  = ()           => apiFetch('/admin/actividades');
export const deleteAdminActividad = (id)         => apiFetch(`/admin/actividades/${id}`,  { method: 'DELETE' });
export const getAdminDeportes     = ()           => apiFetch('/admin/deportes');
export const updateAdminDeporte   = (id, body)   => apiFetch(`/admin/deportes/${id}`,     { method: 'PUT',    body: JSON.stringify(body) });
export const deleteAdminDeporte   = (id)         => apiFetch(`/admin/deportes/${id}`,     { method: 'DELETE' });
