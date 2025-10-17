const CACHE_NAME = 'spotifyLyrics-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/script.js',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/icon-1024x1024.png',
    './icons/favicon.ico',


];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('api.projects.molero.duckdns.org')) {
        return;
    }
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
