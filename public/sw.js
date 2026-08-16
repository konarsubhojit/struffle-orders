const CACHE_NAME = 'kiyon-shell-v1';
const DATA_CACHE = 'kiyon-recent-v1';
const SHELL = ['/', '/orders/create', '/items/create', '/login'];
const DATABASE_NAME = 'kiyon-offline';
const STORE_NAME = 'operations';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isRecentData = /^\/api\/(items|orders)(\/|$)/.test(url.pathname);
  if (isRecentData) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.mode === 'navigate' || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-operations') event.waitUntil(replayQueue());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RETRY_OFFLINE_QUEUE') event.waitUntil(replayQueue());
  if (event.data?.type === 'CLEAR_OFFLINE_CACHES') {
    event.waitUntil(Promise.all([caches.delete(CACHE_NAME), caches.delete(DATA_CACHE)]));
  }
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.json(
      { message: 'This content is not available offline' },
      { status: 503 },
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function replayQueue() {
  const operations = await withStore('readonly', (store) => store.getAll());
  operations.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  for (const operation of operations) {
    try {
      operation.status = 'syncing';
      delete operation.error;
      await withStore('readwrite', (store) => store.put(operation));
      await notifyClients();

      const response = await fetch(operation.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': operation.idempotencyKey,
        },
        body: JSON.stringify(operation.body),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok || (response.status === 409 && data.duplicate)) {
        await withStore('readwrite', (store) => store.delete(operation.id));
      } else {
        operation.status = [400, 404, 409].includes(response.status) ? 'conflict' : 'failed';
        operation.error = data.message || `Sync failed with HTTP ${response.status}`;
        await withStore('readwrite', (store) => store.put(operation));
      }
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Network unavailable';
      await withStore('readwrite', (store) => store.put(operation));
      break;
    } finally {
      await notifyClients();
    }
  }
}

async function notifyClients() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'OFFLINE_QUEUE_CHANGED' }));
}
