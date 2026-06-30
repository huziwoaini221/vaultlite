const CACHE = 'vaultlite-v1'
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.url.startsWith('https://api.github.com')) return
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(r => {
      if (e.request.url.startsWith(location.origin) && e.request.method === 'GET') {
        const c = caches.open(CACHE)
        c.then(cache => cache.put(e.request, r.clone()))
      }
      return r
    }))
  )
})
