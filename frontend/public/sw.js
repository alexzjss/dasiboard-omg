// ── DaSIboard Service Worker v2 — Smart offline caching ───────────────────────
const CACHE_V      = 'dasiboard-v2'
const STATIC_CACHE = 'dasiboard-static-v2'
const API_CACHE    = 'dasiboard-api-v2'

// Static assets — cache on install, serve from cache always
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png',
]

// ── Install — pre-cache static assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate — clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const KEEP = [STATIC_CACHE, API_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch — strategy by request type ──────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin (except fonts)
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.g')) return

  // 1. API calls — network first, fall back to cache (read-only offline)
  if (url.pathname.startsWith('/api/') || url.port === '8000') {
    event.respondWith(networkFirstThenCache(request, API_CACHE, 30 * 1000))
    return
  }

  // 2. Static assets (JS/CSS/fonts/images) — cache first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/) ||
    url.hostname.includes('fonts.g')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 3. HTML navigation — network first, cache fallback for offline
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstThenCache(request, STATIC_CACHE, 5000))
    return
  }

  // 4. Everything else — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
})

// ── Cache strategies ───────────────────────────────────────────────────────────
async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req)
  if (cached) return cached
  const resp = await fetch(req)
  if (resp.ok) {
    const cache = await caches.open(cacheName)
    cache.put(req, resp.clone())
  }
  return resp
}

async function networkFirstThenCache(req, cacheName, timeoutMs = 5000) {
  const cache = await caches.open(cacheName)
  try {
    const ctrl   = new AbortController()
    const timer  = setTimeout(() => ctrl.abort(), timeoutMs)
    const resp   = await fetch(req, { signal: ctrl.signal })
    clearTimeout(timer)
    if (resp.ok) cache.put(req, resp.clone())
    return resp
  } catch {
    const cached = await cache.match(req)
    if (cached) return cached
    // For navigation, serve the shell
    if (req.mode === 'navigate') {
      const shell = await cache.match('/') || await cache.match('/index.html')
      if (shell) return shell
    }
    return new Response('Offline — conteúdo não disponível', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(req)
  const fetchPromise = fetch(req).then(resp => {
    if (resp.ok) cache.put(req, resp.clone())
    return resp
  }).catch(() => null)
  return cached || await fetchPromise
}

// ── Background sync — queue failed API writes ──────────────────────────────────
const SYNC_QUEUE_KEY = 'dasiboard-sync-queue'

self.addEventListener('sync', event => {
  if (event.tag === 'dasiboard-sync') {
    event.waitUntil(flushSyncQueue())
  }
})

async function flushSyncQueue() {
  const clients = await self.clients.matchAll()
  clients.forEach(c => c.postMessage({ type: 'sync-flush' }))
}

// ── Push notifications ─────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'DaSIboard', {
      body:  data.body ?? 'Você tem um novo evento',
      icon:  '/logo192.png',
      badge: '/favicon-32x32.png',
      tag:   data.tag ?? 'dasiboard',
      data:  { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const url = event.notification.data?.url ?? '/'
      const existing = clients.find(c => c.url.includes(url))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})

// ── Message handler — client can trigger cache updates ────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls ?? []
    caches.open(API_CACHE).then(cache => cache.addAll(urls)).catch(() => {})
  }
})
