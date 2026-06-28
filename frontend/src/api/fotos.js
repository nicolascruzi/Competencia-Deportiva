const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() { return localStorage.getItem('nanao_token'); }

export async function uploadFoto(actividadId, file) {
  const formData = new FormData();
  formData.append('foto', file);

  const res = await fetch(`${BASE}/fotos/actividad/${actividadId}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + getToken() },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al subir foto');
  return data;
}

export async function deleteFoto(actividadId) {
  const res = await fetch(`${BASE}/fotos/actividad/${actividadId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + getToken() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar foto');
  return data;
}
