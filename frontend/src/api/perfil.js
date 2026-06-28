const BASE = import.meta.env.VITE_API_URL || '/api';
function getToken() { return localStorage.getItem('nanao_token'); }

export async function updatePerfil(data) {
  const res = await fetch(`${BASE}/perfil`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar perfil');
  return res.json();
}

export async function uploadFotoPerfil(file) {
  const fd = new FormData();
  fd.append('foto', file);
  const res = await fetch(`${BASE}/perfil/foto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) throw new Error('Error al subir foto');
  return res.json();
}

export async function deleteFotoPerfil() {
  const res = await fetch(`${BASE}/perfil/foto`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Error al eliminar foto');
  return res.json();
}
