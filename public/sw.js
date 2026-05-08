// Nivy service worker — handles push notifications + offline shell + deep links.
// Per docs/vision/PRODUCT_WHITEPAPER.md §16 (notifications) and §25 (PWA-first).

// Bump CACHE_NAME whenever the shell list or fetch policy changes so the
// activate handler purges stale entries on the next visit.
const CACHE_NAME = 'nivy-shell-v2'
// /manifest.webmanifest is generated dynamically by app/manifest.ts (Next 16).
// Wave D.4 removed the legacy public/manifest.json to fix a collision with
// the dynamic route — keep this list aligned with reality, don't re-add it.
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Network-first for HTML, cache-first for assets — stay simple, avoid caching API responses.
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/').then((r) => r || new Response('Offline', { status: 503, statusText: 'offline' }))
      )
    )
  } else if (req.destination === 'image' || req.destination === 'font' || req.destination === 'style' || req.destination === 'script') {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(req, clone))
          }
          return res
        }).catch(() => cached)
      )
    )
  }
})

// Push receive — server sends payload via web-push (lib/notifications/triggers.ts)
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Nivy', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Nivy'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-32x32.png',
    tag: payload.tag || 'nivy-notification',
    data: { url: payload.url || '/', ...(payload.data || {}) },
    actions: payload.actions || [],
    requireInteraction: Boolean(payload.requireInteraction),
    silent: Boolean(payload.silent),
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Click handler — deep link into the app per whitepaper §16 invariants
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      // Reuse an existing window if same origin
      for (const client of clientsArr) {
        if (client.url && new URL(client.url).origin === self.location.origin && 'focus' in client) {
          client.navigate(targetUrl).catch(() => {})
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})

// Subscription change (browser may rotate the endpoint).
// The real subscribe route lives at /api/notifications/push/subscribe and
// requires an authenticated userId in the body — which the SW context does
// not have. We post a minimal "rotated" signal and let the next foreground
// session re-subscribe through lib/hooks/use-notifications.ts.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription ? event.oldSubscription.options.applicationServerKey : undefined,
    }).then((newSub) =>
      fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: newSub, rotated: true }),
        credentials: 'include',
      }).catch(() => {
        // Server may reject (no userId) — that's fine, the next foreground
        // session will resubscribe through the consent-gated flow.
      })
    )
  )
})
