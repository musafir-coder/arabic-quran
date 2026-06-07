const CACHE = 'arabic-quran-v5';
const ASSETS = [
  '/arabic-quran/',
  '/arabic-quran/index.html',
  '/arabic-quran/style.css',
  '/arabic-quran/app.js',
  '/arabic-quran/words.js',
  '/arabic-quran/firebase-config.js',
  '/arabic-quran/firebase-sync.js',
  '/arabic-quran/manifest.json',
  '/arabic-quran/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match('/arabic-quran/')))
  );
});
