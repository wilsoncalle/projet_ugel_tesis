// Service Worker con Workbox - Fallback Automático
// Sistema Integral de Control de Acceso - UGEL Talara

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, setCatchHandler, setDefaultHandler } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// ========== CONFIGURACIÓN ==========
const CACHE_NAMES = {
  PAGES: 'ugel-pages-v1',
  API: 'ugel-api-v1',
  ASSETS: 'ugel-assets-v1',
  IMAGES: 'ugel-images-v1'
};

const OFFLINE_URL = '/offline.html';

// ========== PRECACHE ==========
// Workbox pre-cacheará automáticamente todos los assets del build
precacheAndRoute(self.__WB_MANIFEST || []);

// Limpiar caches antiguas automáticamente
cleanupOutdatedCaches();

console.log('[Service Worker] Workbox cargado');

// ========== ESTRATEGIAS DE CACHE ==========

// 1. NAVEGACIÓN (HTML): Network First con timeout corto
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: CACHE_NAMES.PAGES,
    networkTimeoutSeconds: 3, // Si la red no responde en 3s, usar cache
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      })
    ]
  })
);

// 2. API CALLS: Network First (intenta red, si falla usa cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: CACHE_NAMES.API,
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5 // 5 minutos
      })
    ]
  })
);

// 3. ASSETS ESTÁTICOS (JS, CSS): Stale While Revalidate
registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.ASSETS,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días
      })
    ]
  })
);

// 4. IMÁGENES: Cache First (son estáticas, no cambian)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: CACHE_NAMES.IMAGES,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días
      })
    ]
  })
);

// 5. UPLOADS (fotos de personal/visitantes): Cache First también
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new CacheFirst({
    cacheName: CACHE_NAMES.IMAGES,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60 // 7 días
      })
    ]
  })
);

// ========== FALLBACK CUANDO TODO FALLA ==========
setCatchHandler(async ({ event }) => {
  // Si es navegación y falla, servir offline.html
  if (event.request.mode === 'navigate') {
    const cache = await caches.match(OFFLINE_URL, { ignoreSearch: true });
    if (cache) {
      console.log('[Service Worker] Red falló, sirviendo offline.html');
      return cache;
    }
  }

  // Para API: devolver JSON con estado offline
  if (event.request.url.includes('/api/')) {
    console.log('[Service Worker] API falló, devolviendo respuesta offline');
    return new Response(
      JSON.stringify({ 
        error: 'Sin conexión',
        offline: true 
      }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Para todo lo demás: error genérico
  return Response.error();
});

// ========== BACKGROUND SYNC ==========
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event detectado:', event.tag);
  
  if (event.tag === 'offline-sync' || event.tag.startsWith('sync-')) {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  console.log('[Service Worker] Notificando a clientes para sincronización...');
  
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REQUESTED'
      });
    });

    console.log('[Service Worker] Notificaciones enviadas a clientes');
  } catch (error) {
    console.error('[Service Worker] Error en notifyClientsToSync:', error);
    throw error;
  }
}

// ========== MENSAJES DEL CLIENTE ==========
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensaje recibido:', event.data);
  
  // Forzar sincronización manual
  if (event.data && event.data.type === 'SYNC_NOW') {
    notifyClientsToSync().then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    }).catch(error => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
    });
  }

  // Actualizar Service Worker inmediatamente
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Mostrar notificación del sistema
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, {
      ...event.data.options,
      data: event.data.options.data || {}
    });
  }
});

// ========== NOTIFICACIONES DEL SISTEMA ==========
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Click en notificación');
  event.notification.close();

  // Abrir o enfocar la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('[Service Worker] Configuración completada ✅');
