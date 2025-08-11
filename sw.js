self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('p0pi-v1').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/style.css',
        'https://cdn.tailwindcss.com',
        'https://unpkg.com/lucide@latest',
        'https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js',
        'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js',
        'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js',
        'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js',
        'https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js',
        'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
