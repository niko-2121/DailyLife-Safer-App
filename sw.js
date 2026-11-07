/* Offline-Zwischenspeicher: immer zuerst die neueste Version aus dem Netz, sonst die gespeicherte. */
const CACHE = 'dls-v1';
const SHELL = ['./', 'index.html', 'config.js', 'stickers.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || /supabase\.co$/.test(u.hostname)) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (u.origin === location.origin || /jsdelivr|gstatic|googleapis/.test(u.hostname))) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('index.html'))));
});
