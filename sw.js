// Service Worker for 猫の健康管理OS
const CACHE_NAME = 'neko-health-v2.2';
const ASSETS = [
    './',
    './index.html',
    './css/variables.css',
    './css/base.css',
    './css/components.css',
    './css/dashboard.css',
    './css/cat-detail.css',
    './css/timeline.css',
    './js/utils.js',
    './js/drive.js',
    './js/store.js',
    './js/scoring.js',
    './js/notifications.js',
    './js/timeline.js',
    './js/components/modal.js',
    './js/components/dashboard.js',
    './js/components/cat-form.js',
    './js/components/cat-detail.js',
    './js/components/weight.js',
    './js/components/sos.js',
    './js/components/incident.js',
    './js/components/approval.js',
    './js/components/visual-check.js',
    './js/app.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Network first, fallback to cache
    e.respondWith(
        fetch(e.request)
            .then(resp => {
                const clone = resp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return resp;
            })
            .catch(() => caches.match(e.request))
    );
});
