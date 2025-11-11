// Service Worker Mejorado con Background Sync
// Sistema Integral de Control de Acceso - UGEL Talara

const CACHE_NAME = 'ugel-access-cache-v2';
const OFFLINE_URL = '/offline.html';
// Usar ruta relativa para que funcione con el proxy en dev y producción
const API_BASE_URL = '/api';

// Assets estáticos para cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// ========== INSTALL EVENT ==========
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Cacheando assets estáticos');
      
      // Cachear assets de forma silenciosa (sin fallar si alguno no está disponible)
      await Promise.allSettled(
        STATIC_ASSETS.map(url => 
          cache.add(url).catch(err => 
            console.warn(`[Service Worker] No se pudo cachear ${url}:`, err)
          )
        )
      );
      
      await self.skipWaiting();
      console.log('[Service Worker] Instalación completada');
    })()
  );
});

// ========== ACTIVATE EVENT ==========
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando...');
  
  event.waitUntil(
    (async () => {
      // Limpiar caches antiguas
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('[Service Worker] Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          })
      );
      
      await self.clients.claim();
      console.log('[Service Worker] Activación completada');
    })()
  );
});

// ========== FETCH EVENT ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones cross-origin no API
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) {
    return;
  }

  // Estrategia para peticiones GET
  if (request.method === 'GET') {
    // API: Network First (intentar red primero, luego cache)
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(networkFirstStrategy(request));
      return;
    }
    
    // Assets estáticos: Cache First (cache primero, luego red)
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Estrategias para POST/PUT/DELETE (operaciones de escritura)
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    event.respondWith(handleWriteOperation(request));
    return;
  }
});

// ========== SYNC EVENT (Background Sync) ==========
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event detectado:', event.tag);
  
  if (event.tag === 'offline-sync' || event.tag.startsWith('sync-')) {
    event.waitUntil(syncOfflineData());
  }
});

// ========== MESSAGE EVENT ==========
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    syncOfflineData().then(() => {
      // Notificar al cliente que la sincronización está completa
      event.ports[0].postMessage({ success: true });
    }).catch(error => {
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ========== ESTRATEGIAS DE CACHE ==========

/**
 * Estrategia Cache First: intenta obtener del cache primero
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Solo cachear respuestas exitosas
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Error en cache-first:', error);
    
    // Si es una navegación y falla, mostrar página offline
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      const offlinePage = await cache.match(OFFLINE_URL);
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Estrategia Network First: intenta la red primero, luego cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear respuestas GET exitosas de la API
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[Service Worker] Red falló, buscando en cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ 
      error: 'Sin conexión',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Maneja operaciones de escritura (POST/PUT/DELETE)
 */
async function handleWriteOperation(request) {
  try {
    // Intentar enviar la petición
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    console.warn('[Service Worker] Operación de escritura falló, guardando offline');
    
    // Guardar la petición en IndexedDB para sincronizar después
    await storeRequestForSync(request.clone());
    
    // Devolver respuesta indicando que se guardó offline
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'Operación guardada. Se sincronizará automáticamente cuando vuelva la conexión.'
    }), {
      status: 202, // Accepted
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ========== FUNCIONES AUXILIARES ==========

/**
 * Guarda una petición fallida para sincronizar después
 * NOTA: Esta función ya no se usa porque manejamos offline en offlineDB.js
 * La mantenemos para compatibilidad pero no hace nada crítico
 */
async function storeRequestForSync(request) {
  try {
    console.log('[Service Worker] Petición falló, será manejada por la app:', request.url);
    
    // Registrar sync si está disponible
    if (self.registration.sync) {
      await self.registration.sync.register('offline-sync');
    }
  } catch (error) {
    console.error('[Service Worker] Error en storeRequestForSync:', error);
  }
}

/**
 * Sincroniza datos offline con el servidor
 * NOTA: La sincronización real se maneja en offlineSync.js
 * Este método solo notifica a los clientes para que sincronicen
 */
async function syncOfflineData() {
  console.log('[Service Worker] Notificando a clientes para sincronización...');
  
  try {
    // Notificar a todos los clientes para que sincronicen
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REQUESTED'
      });
    });

    console.log('[Service Worker] Notificaciones enviadas a clientes');
  } catch (error) {
    console.error('[Service Worker] Error en syncOfflineData:', error);
    throw error;
  }
}

/**
 * NOTA: La base de datos IndexedDB se maneja completamente en offlineDB.js
 * No necesitamos crear/manejar stores aquí en el Service Worker
 * Esta función se mantiene solo por compatibilidad pero no se usa
 */
function openDatabase() {
  return Promise.resolve(null);
}

console.log('[Service Worker] Script cargado');
