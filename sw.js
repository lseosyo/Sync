// 캘린더 앱 서비스워커: 오프라인에서도 앱 셸이 열리도록 정적 자원을 캐시합니다.
// 실제 일정 데이터는 앱 내부 메모리 + 구글 시트 동기화로 관리되며, 이 캐시와는 무관합니다.

const CACHE_NAME = 'calendar-app-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 앱스크립트 동기화 요청은 네트워크로만 처리 (캐시하지 않음)
  if (req.url.includes('script.google.com')) {
    event.respondWith(fetch(req));
    return;
  }

  // 그 외 요청: 캐시 우선, 없으면 네트워크 후 캐시에 저장
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (req.method === 'GET' && res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
