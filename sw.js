// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('p0pi-cache').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        '/firebase-config.js',
        '/auth.js',
        '/chat.js',
        '/friends-list.js',
        '/friends-request.js',
        '/ui.js',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
