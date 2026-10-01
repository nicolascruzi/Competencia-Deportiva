import { apiFetch } from './client';

export const getCompetencia       = (id)     => apiFetch(`/competencias/${id}`);
export const getRankingComp       = (id, mes) => apiFetch(`/competencias/${id}/ranking${mes ? `?mes=${mes}` : ''}`);
export const getMesesComp         = (id)     => apiFetch(`/competencias/${id}/meses`);
export const updatePonderadores   = (id, ponderadores) => apiFetch(`/competencias/${id}/deportes`, { method: 'PUT', body: JSON.stringify({ ponderadores }) });
export const getActividadesComp   = (id, mes) => apiFetch(`/competencias/${id}/actividades${mes ? `?mes=${mes}` : ''}`);

export const getRankingEquiposComp = (id, mes)          => apiFetch(`/competencias/${id}/ranking-equipos${mes ? `?mes=${mes}` : ''}`);
export const updateSemanas         = (id, semanas)      => apiFetch(`/competencias/${id}/semanas`, { method: 'PUT', body: JSON.stringify({ semanas }) });
export const updateConfiguracion   = (id, data)         => apiFetch(`/competencias/${id}/configuracion`, { method: 'PUT', body: JSON.stringify(data) });

export const getVotacionSemana   = (id, semanaId)             => apiFetch(`/competencias/${id}/semanas/${semanaId}/votacion`);
export const votarDeporteSemana  = (id, semanaId, deporteId)  => apiFetch(`/competencias/${id}/semanas/${semanaId}/votar`, { method: 'POST', body: JSON.stringify({ deporte_id: deporteId }) });

export const crearChallenge         = (id, data)              => apiFetch(`/competencias/${id}/challenges`, { method: 'POST', body: JSON.stringify(data) });
export const updateChallenge        = (id, challengeId, data)  => apiFetch(`/competencias/${id}/challenges/${challengeId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChallenge        = (id, challengeId)        => apiFetch(`/competencias/${id}/challenges/${challengeId}`, { method: 'DELETE' });
export const completarChallenge     = (id, challengeId)        => apiFetch(`/competencias/${id}/challenges/${challengeId}/completar`, { method: 'POST' });
export const descompletarChallenge  = (id, challengeId)        => apiFetch(`/competencias/${id}/challenges/${challengeId}/completar`, { method: 'DELETE' });
export const getCompletadosChallenge = (id, challengeId)       => apiFetch(`/competencias/${id}/challenges/${challengeId}/completados`);

export const getComentarios    = (actividadId)           => apiFetch(`/comentarios/${actividadId}`);
export const createComentario  = (actividadId, contenido) => apiFetch(`/comentarios/${actividadId}`, { method: 'POST', body: JSON.stringify({ contenido }) });
export const deleteComentario  = (id)                    => apiFetch(`/comentarios/${id}`, { method: 'DELETE' });

export const getLikes          = (actividadId)           => apiFetch(`/likes/${actividadId}`);
export const toggleLike        = (actividadId)           => apiFetch(`/likes/${actividadId}`, { method: 'POST' });
