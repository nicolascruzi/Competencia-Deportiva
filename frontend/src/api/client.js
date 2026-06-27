const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() { return localStorage.getItem('nanao_token'); }

export async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la API');
  return data;
}
