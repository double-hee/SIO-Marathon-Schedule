const CACHE_NAME = 'sio-app-v2';
const APP_SHELL = [
  './',
  './index.html',
  './sio-logo.jpg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 대회/참가 데이터(Apps Script)는 항상 최신이어야 하므로 캐시하지 않고 네트워크로 바로 보냄
  if (e.request.method !== 'GET' || e.request.url.includes('script.google.com')) return;

  // 네트워크와 짧은 타임아웃(1.2초)을 경쟁시켜서: 회선이 괜찮으면 항상 최신 버전을,
  // 회선이 느릴 때만 캐시를 우선 보여주고 네트워크는 백그라운드에서 계속 캐시를 갱신함
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const networkPromise = fetch(e.request)
      .then((res) => { cache.put(e.request, res.clone()); return res; })
      .catch(() => null);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1200));

    const fast = await Promise.race([networkPromise, timeoutPromise]);
    if (fast) return fast;

    const cached = await cache.match(e.request);
    return cached || networkPromise || fetch(e.request);
  })());
});
