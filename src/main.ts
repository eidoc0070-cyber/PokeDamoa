import './style.css';
import { initApp } from './app.js';
import { globalStore } from './state/store.js';
import * as PokemonMath from './utils/pokemon-math.js';
import * as Hangul from './utils/hangul.js';
import { getLoadedData } from './data/pokeapi.js';

// 개발 및 디버깅 편의를 위해 전역 객체 노출
window.PokeApp = {
  store: globalStore,
  math: PokemonMath,
  hangul: Hangul,
  data: getLoadedData
};

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (rootElement) {
  initApp(rootElement);
} else {
  console.error("Root element #app not found!");
}

// 서비스 워커 등록 (PWA 및 오프라인 지원)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker 등록 성공:', registration.scope);

            // 업데이트 확인 로직
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 새로운 버전이 설치됨 (기존에 컨트롤러가 있었던 경우에만 알림)
                        if (confirm('새로운 버전이 준비되었습니다. 지금 업데이트하시겠습니까?')) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            window.location.reload();
                        }
                    }
                });
            });
        } catch (err) {
            console.error('Service Worker 등록 실패:', err);
        }
    });

    // 컨트롤러 변경 감지 (새 서비스 워커가 제어권을 가졌을 때 새로고침)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}
