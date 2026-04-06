import { globalStore } from './state/store.js';
import type { AppState } from './state/store.js';
import { renderSettings } from './features/settings/index.js';
import { renderTypeCalculator } from './features/type-calculator/index.js';
import { renderPokedex } from './features/pokedex/index.js';
import { renderStatCalculator } from './features/stat-calculator/index.js';
import { renderDamageCalculator } from './features/damage-calculator/index.js';

/**
 * 애플리케이션의 메인 레이아웃 및 탭 라우팅을 초기화합니다.
 */
export function initApp(container: HTMLElement) {
  // 1. 기본 레이아웃 골격 생성
  container.innerHTML = `
    <div class="app-container" style="max-width: 1000px; margin: 0 auto; padding: 20px;">
      <header id="main-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0;">PokéDamoa</h1>
        <div class="header-buttons">
            <button id="btn-save">저장</button>
            <button id="btn-share">공유</button>
            <button id="btn-apply">적용</button>
        </div>
      </header>
      
      <nav id="tab-menu" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button data-tab="settings" style="padding: 10px 15px; font-weight: bold; cursor:pointer;">설정</button>
        <button data-tab="type-calculator" style="padding: 10px 15px; cursor:pointer;">타입 계산기</button>
        <button data-tab="pokedex" style="padding: 10px 15px; cursor:pointer;">포켓몬 도감</button>
        <button data-tab="stat-calculator" style="padding: 10px 15px; cursor:pointer; border-color: #673ab7;">실수값 계산기</button>
        <button data-tab="damage-calculator" style="padding: 10px 15px; cursor:pointer; border-color: #e65100;">데미지 계산기</button>
      </nav>

      <main id="tab-content" style="background: var(--bg-color); min-height: 400px; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- 선택된 탭(feature)의 화면이 렌더링될 자리 -->
      </main>
    </div>
  `;

  // 2. 다크모드 전역 스타일 연동 (Store Subscription)
  // Store의 isDarkMode 값이 바뀔 때마다 html 태그에 data-theme 속성을 토글시킵니다.
  globalStore.subscribe((state: AppState) => {
    if (state.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      // 배경색 등 CSS 변수가 즉시 반영됩니다.
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  });

  // 초기 상태 로드시 즉시 반영
  if (globalStore.getState().isDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // 3. 탭 라우팅 처리 로직
  const tabContent = container.querySelector<HTMLElement>('#tab-content')!;
  let cleanupCurrentTab: (() => void) | null = null;

  const navigateTo = (tabName: string) => {
    // 탭을 전환하기 전에 기존 탭에서 사용하던 리스너 등을 치웁니다.
    if (cleanupCurrentTab) {
        cleanupCurrentTab();
        cleanupCurrentTab = null;
    }
    tabContent.innerHTML = ''; // 화면 지우기

    switch (tabName) {
      case 'settings':
        cleanupCurrentTab = renderSettings(tabContent);
        break;
      case 'type-calculator':
        cleanupCurrentTab = renderTypeCalculator(tabContent);
        break;
      case 'pokedex':
        // renderPokedex는 비동기 함수지만, 반환하는 cleanup 함수 처리방식이 약간 다를 수 있으므로 체이닝 사용
        renderPokedex(tabContent).then(cleanup => {
            cleanupCurrentTab = cleanup;
        });
        break;
      case 'stat-calculator':
        renderStatCalculator(tabContent).then(cleanup => {
            cleanupCurrentTab = cleanup;
        });
        break;
      case 'damage-calculator':
        renderDamageCalculator(tabContent).then(cleanup => {
            cleanupCurrentTab = cleanup;
        });
        break;
      default:
        tabContent.innerHTML = '<p>아직 연결되지 않은 탭입니다.</p>';
        break;
    }
  };

  // 탭 버튼들에 클릭 이벤트 부여
  const tabs = container.querySelectorAll<HTMLButtonElement>('#tab-menu button');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      if (tabName) navigateTo(tabName);
    });
  });

  // 최초 로드 시 'settings' 탭 표시
  navigateTo('settings');
}
