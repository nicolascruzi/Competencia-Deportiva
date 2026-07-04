// Service Worker — Pura Racha push notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pura Racha', body: event.data.text() };
  }

  const title   = payload.title || 'Pura Racha';
  const options = {
    body:    payload.body || '',
    icon:    '/favicon.svg',
    badge:   '/favicon.svg',
    data:    payload.data || {},
    vibrate: [100, 50, 100],
    tag:     `pura-racha-${payload.data?.tipo || 'notif'}-${payload.data?.actividad_id || Date.now()}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actividadId = event.notification.data?.actividad_id;
  const url = self.location.origin + (actividadId ? `/?open=${actividadId}` : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la app ya está abierta, enfocarla y enviarle un mensaje
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          client.focus();
          if (actividadId) {
            client.postMessage({ type: 'OPEN_ACTIVIDAD', actividadId });
          }
          return;
        }
      }
      // Si no está abierta, abrir nueva ventana
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
