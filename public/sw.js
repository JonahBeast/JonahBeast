/* Service worker de Jonah Beast Fuel

   Estrategia: SIEMPRE intenta la red primero.
   El caché solo se usa como respaldo si el usuario se queda sin conexión.
   Así nunca se queda con una versión vieja de la app.               */

const CACHE = 'jb-fuel-v1';

self.addEventListener('install', (e) => {
  // Activar de inmediato, sin esperar a que cierren pestañas viejas
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Borrar cachés de versiones anteriores
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Solo manejamos navegación y recursos propios
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      const red = await fetch(req);
      // Guardar copia por si luego no hay conexión
      if (red && red.status === 200) {
        const cache = await caches.open(CACHE);
        cache.put(req, red.clone());
      }
      return red;
    } catch (err) {
      // Sin conexión: usar la copia guardada
      const guardada = await caches.match(req);
      if (guardada) return guardada;
      if (req.mode === 'navigate') {
        const inicio = await caches.match('/');
        if (inicio) return inicio;
      }
      throw err;
    }
  })());
});

/* ---------- Notificaciones ---------- */

self.addEventListener('push', (e) => {
  let datos = { titulo: 'Jonah Beast Fuel', cuerpo: '¿Ya registraste tus comidas de hoy?' };
  try {
    if (e.data) datos = { ...datos, ...e.data.json() };
  } catch {}

  e.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'jb-recordatorio',
      renotify: false,
      data: { url: datos.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if (v.url.includes(self.location.origin)) {
        await v.focus();
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
