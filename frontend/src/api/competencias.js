import { apiFetch } from './client';

export const getCompetencias      = ()       => apiFetch('/competencias');
export const getCompetencia       = (id)     => apiFetch(`/competencias/${id}`);
export const createCompetencia    = (body)   => apiFetch('/competencias',          { method: 'POST', body: JSON.stringify(body) });
export const joinCompetencia      = (pin)    => apiFetch('/competencias/join',      { method: 'POST', body: JSON.stringify({ pin }) });
export const getRankingComp       = (id, mes) => apiFetch(`/competencias/${id}/ranking${mes ? `?mes=${mes}` : ''}`);
export const getMesesComp         = (id)     => apiFetch(`/competencias/${id}/meses`);
export const updatePonderadores   = (id, ponderadores) => apiFetch(`/competencias/${id}/deportes`, { method: 'PUT', body: JSON.stringify({ ponderadores }) });
