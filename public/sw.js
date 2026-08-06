// SW Version Update Test (v1.0.1)
const CACHE_NAME = 'pokedamoa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/icons/favicon.ico'
];

// 설치 시 기본 정적 자원 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화 시 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 페치 이벤트 처리
self.addEventListener('fetch', (event) => {
  // GET 요청만 캐싱 처리
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. 데이터(JSON) 및 이미지(Sprites)는 Cache-First 전략
  if (url.pathname.endsWith('.json') || url.pathname.includes('/sprites/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          // 성공적인 응답(200 OK)이거나 불투명 응답(opaque)인 경우 캐싱
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. 그 외 정적 자원(JS, CSS, HTML, Assets)은 Stale-While-Revalidate 전략
  // 캐시에 저장된 버전이 있으면 즉시 반환하여 오프라인/네트워크 지연 시 즉시 진입(0초)을 보장하고,
  // 백그라운드에서 네트워크 요청을 수행하여 최신 자원으로 캐시를 갱신함.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // 백그라운드 네트워크 요청 실패 (오프라인 등) - 무시함
          });

        // 캐시에 있으면 즉시 캐시 응답 반환, 없으면 네트워크 요청 기다림
        return cachedResponse || fetchPromise.then((networkResponse) => {
          if (networkResponse) return networkResponse;

          // 외부 폰트(Google Fonts) 요청인 경우 콘솔 에러 방지를 위해 빈 응답 반환
          if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
            return new Response('', { status: 200, statusText: 'OK' });
          }

          // HTML/네비게이션 요청인 경우 루트 캐시나 기본 오프라인 응답 제공
          if (event.request.mode === 'navigate') {
            return caches.match('/').then((rootResponse) => {
              return rootResponse || new Response('Offline - No Cache Available', {
                status: 503,
                headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
              });
            });
          }

          return new Response('Offline and not cached', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      });
    })
  );
});

// 업데이트 메시지 수신 시 처리
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
