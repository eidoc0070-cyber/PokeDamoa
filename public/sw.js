const CACHE_NAME = 'pokedamoa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/favicon.ico'
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

  // 2. 그 외 정적 자원(JS, CSS, HTML, Assets)은 Network-First 전략
  // 캐시 트래핑을 방지하면서 오프라인 지원을 위해 네트워크 성공 시 캐시를 업데이트함
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 성공적인 응답인 경우 캐시에 저장
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 네트워크 실패 시(오프라인 등) 캐시에서 반환
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // 캐시에도 없는 경우, TypeError 방지를 위해 반드시 Response 객체 반환
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
      })
  );
});

// 업데이트 메시지 수신 시 처리
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
