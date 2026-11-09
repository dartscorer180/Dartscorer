
const CACHE_NAME = "dart-scorer-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icon.svg"
];

// App-Dateien speichern
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// Alte Versionen entfernen
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );

    self.clients.claim();
});

// Dateien aus dem Cache laden
self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(response => {
                if (
                    response &&
                    response.status === 200 &&
                    new URL(event.request.url).origin === self.location.origin
                ) {
                    const responseCopy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseCopy);
                    });
                }

                return response;
            });
        })
    );
});
