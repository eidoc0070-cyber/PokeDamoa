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

// PWA 설치 프로모션 지원을 위한 beforeinstallprompt 이벤트 처리
window.addEventListener('beforeinstallprompt', (e) => {
  // 브라우저의 기본 설치 배너/다이얼로그 노출 방지
  e.preventDefault();
  // 이벤트를 저장해 두었다가 나중에 트리거할 때 사용
  window.deferredPrompt = e;
  
  // 상태 변경 알림 이벤트 발생 (UI 컴포넌트가 감지할 수 있도록)
  window.dispatchEvent(new CustomEvent('pwa-installable'));
  console.log('PWA 설치 준비 완료 (beforeinstallprompt 이벤트 감지됨)');
});

window.addEventListener('appinstalled', () => {
  // 설치가 완료되면 저장해둔 프로프트 초기화
  window.deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-installed'));
  console.log('PWA가 성공적으로 설치되었습니다.');
});

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
