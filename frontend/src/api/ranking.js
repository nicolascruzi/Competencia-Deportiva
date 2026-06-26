import { apiFetch } from './client';

export const getRanking = (mes) => apiFetch('/ranking' + (mes ? '?mes=' + mes : ''));
export const getMeses   = ()    => apiFetch('/ranking/meses');
