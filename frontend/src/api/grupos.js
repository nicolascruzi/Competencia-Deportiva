import { apiFetch } from './client';

export const getGrupos         = ()        => apiFetch('/grupos');
export const getGrupo          = (id)       => apiFetch(`/grupos/${id}`);
export const createGrupo       = (body)     => apiFetch('/grupos',          { method: 'POST', body: JSON.stringify(body) });
export const joinGrupo         = (pin)      => apiFetch('/grupos/join',     { method: 'POST', body: JSON.stringify({ pin }) });
export const getCompetenciasGrupo  = (id)   => apiFetch(`/grupos/${id}/competencias`);
export const crearCompetenciaGrupo = (id, body) => apiFetch(`/grupos/${id}/competencias`, { method: 'POST', body: JSON.stringify(body) });
export const cerrarCompetenciaGrupo = (id, compId) => apiFetch(`/grupos/${id}/competencias/${compId}/cerrar`, { method: 'POST' });
export const borrarCompetenciaGrupo = (id, compId) => apiFetch(`/grupos/${id}/competencias/${compId}`, { method: 'DELETE' });
export const salirDeGrupo           = (id)         => apiFetch(`/grupos/${id}/participantes/me`, { method: 'DELETE' });
export const borrarGrupo            = (id, confirmarNombre) => apiFetch(`/grupos/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmarNombre }) });

export const getEquiposGrupo      = (id)              => apiFetch(`/grupos/${id}/equipos`);
export const updateEquiposGrupo   = (id, equipos)      => apiFetch(`/grupos/${id}/equipos`, { method: 'PUT', body: JSON.stringify({ equipos }) });
export const updateAsignacionesGrupo = (id, asignaciones) => apiFetch(`/grupos/${id}/equipos/asignaciones`, { method: 'PUT', body: JSON.stringify({ asignaciones }) });

export const promoverAdmin = (id, userId) => apiFetch(`/grupos/${id}/admins`, { method: 'POST', body: JSON.stringify({ user_id: userId }) });
export const quitarAdmin   = (id, userId) => apiFetch(`/grupos/${id}/admins/${userId}`, { method: 'DELETE' });
