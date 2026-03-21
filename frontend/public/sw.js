// ── DaSIboard Service Worker — Offline support ────────────────────────────────
const CACHE_NAME = 'dasiboard-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin API calls
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Network-first for HTML (fresh content), cache-first for assets
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(request, clone)); return res })
        .catch(() => caches.match(request).then(r => r ?? caches.match('/')))
    )
    return
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(res => {
        if (!res.ok) return res
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(request, clone))
        return res
      })
    })
  )
})

// Notify clients when online/offline
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PING') {
    event.ports[0].postMessage({ type: 'PONG' })
  }
})
