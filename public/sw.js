/* MCHFMS service worker — offline-friendly app shell.
   Only same-origin GET requests are cached; Supabase API calls always go to
   the network so data is never stale or faked. */

const CACHE = 'mchfms-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // never intercept API/fonts/etc.

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(request, { ignoreSearch: true })
      try {
        const fresh = await fetch(request)
        if (fresh.ok) cache.put(request, fresh.clone())
        return fresh
      } catch {
        // Offline: serve the cached copy, or the app shell for navigations.
        if (cached) return cached
        if (request.mode === 'navigate') {
          const shell = await cache.match('./index.html')
          if (shell) return shell
        }
        throw new Error('Offline and no cached copy available')
      }
    })(),
  )
})
