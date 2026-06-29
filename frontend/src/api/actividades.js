import { apiFetch } from './client';

export const getActividades  = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch('/actividades' + (qs ? '?' + qs : ''));
};
export const createActividad = (body)        => apiFetch('/actividades',      { method: 'POST',   body: JSON.stringify(body) });
export const updateActividad = (id, body)    => apiFetch(`/actividades/${id}`,{ method: 'PUT',    body: JSON.stringify(body) });
export const deleteActividad = (id)          => apiFetch(`/actividades/${id}`,{ method: 'DELETE' });
export const getDeportes     = ()            => apiFetch('/actividades/deportes');
export const createDeporte  = (body)        => apiFetch('/actividades/deportes', { method: 'POST', body: JSON.stringify(body) });
