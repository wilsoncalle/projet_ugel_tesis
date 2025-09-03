// Service Worker for UGEL Access Control System
const CACHE_NAME = 'ugel-access-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately when the service worker is installed
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.ico',
  '/manifest.json',
  '/assets/index.js',
  '/assets/index.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[Service Worker] Caching static assets');
      await cache.addAll(STATIC_ASSETS);
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
      await self.clients.claim();
    })()
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    // For POST/PUT requests that fail, store them in IndexedDB for later retry
    if ((event.request.method === 'POST' || event.request.method === 'PUT') && 
        event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request.clone())
          .catch((error) => {
            // Store failed requests in IndexedDB for later retry
            storeFailedRequest(event.request.clone());
            return new Response(JSON.stringify({ 
              error: 'Network error. Request stored for later retry.' 
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          })
      );
    }
    return;
  }

  // Handle API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      networkFirst(event.request)
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    cacheFirst(event.request)
  );
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // If it's a navigation request, return the offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_URL);
    }
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Network-first strategy for API requests
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Network error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Store failed requests in IndexedDB for later retry
async function storeFailedRequest(request) {
  // This is a simplified implementation
  // In a real app, you would use IndexedDB to store the request details
  console.log('[Service Worker] Storing failed request for later retry:', request.url);
  
  // You can implement the IndexedDB storage here
  // For example:
  /*
  const db = await openDB('failed-requests', 1, {
    upgrade(db) {
      db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
    },
  });
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now(),
  };
  
  await db.add('requests', requestData);
  */
}

// Listen for online status to retry failed requests
self.addEventListener('online', (event) => {
  console.log('[Service Worker] Back online, retrying failed requests');
  // Implement retry logic here
  // For example:
  /*
  retryFailedRequests();
  */
});

// Sync event for background sync API
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

// Function to retry failed requests
async function retryFailedRequests() {
  // Implement retry logic here
  console.log('[Service Worker] Retrying failed requests');
  
  // For example:
  /*
  const db = await openDB('failed-requests', 1);
  const failedRequests = await db.getAll('requests');
  
  for (const request of failedRequests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.body,
      });
      
      if (response.ok) {
        // Request succeeded, remove from IndexedDB
        await db.delete('requests', request.id);
      }
    } catch (error) {
      console.error('[Service Worker] Retry failed:', error);
    }
  }
  */
}
