const CACHE = 'mfs-12wy-v1';
const ASSETS = ['./', './index.html', './style.css', './app.js', './MFSlogo2025.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow('/')); });
