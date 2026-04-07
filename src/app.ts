import { globalStore } from './state/store.js';
import type { AppState } from './state/store.js';
import { loadSettings, saveSettings, getExternalLinks } from './state/storage.js';
import { getTabFromPath, updatePath, getCurrentStateUrl, restoreStateFromUrl } from './state/url-params.js';
import { renderSettings } from './features/settings/index.js';
import { renderTypeCalculator } from './features/type-calculator/index.js';
import { renderPokedex } from './features/pokedex/index.js';
import { renderStatCalculator } from './features/stat-calculator/index.js';
import { renderDamageCalculator } from './features/damage-calculator/index.js';
import { renderCatchCalculator } from './features/catch-calculator/index.js';
import { renderExternalLinks } from './features/external-links/index.js';

/**
 * 애플리케이션의 메인 레이아웃 및 탭 라우팅을 초기화합니다.
 */
export function initApp(container: HTMLElement) {
  // 1. 초기 상태 로드 (LocalStorage)
  const saved = loadSettings();
  if (saved) {
    globalStore.setState({
      isDarkMode: saved.isDarkMode,
      isCustomMode: saved.isCustomMode,
      generation: saved.generation
    });
  }

  // 2. 기본 레이아웃 골격 생성
  container.innerHTML = `
    <div class="app-container" style="max-width: 1000px; margin: 0 auto; padding: 20px;">
      <header id="main-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 20px; position: relative;">
        <div style="display:flex; align-items:center; gap:15px;">
          <button id="hamburger-menu-btn" class="mobile-only" style="background:none; border:none; font-size:1.8rem; cursor:pointer; padding:0; display:none;">☰</button>
          <h1 style="margin: 0; cursor:pointer;" id="site-logo">PokéDamoa</h1>
        </div>
        <div class="header-buttons" style="display:flex; gap:10px;">
            <button id="btn-save" style="padding:5px 12px; cursor:pointer; background:#4caf50; color:#fff; border:none; border-radius:4px;">저장</button>
            <button id="btn-copy-url" style="padding:5px 12px; cursor:pointer; background:#2196f3; color:#fff; border:none; border-radius:4px;">URL 복사</button>
        </div>
      </header>
      
      <nav id="tab-menu" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button data-tab="settings" style="padding: 10px 15px; font-weight: bold; cursor:pointer;">설정</button>
        <button data-tab="type-calculator" style="padding: 10px 15px; cursor:pointer;">타입 계산기</button>
        <button data-tab="pokedex" style="padding: 10px 15px; cursor:pointer;">포켓몬 도감</button>
        <button data-tab="stat-calculator" style="padding: 10px 15px; cursor:pointer; border-color: #673ab7;">실수값 계산기</button>
        <button data-tab="damage-calculator" style="padding: 10px 15px; cursor:pointer; border-color: #e65100;">데미지 계산기</button>
        <button data-tab="catch-calculator" style="padding: 10px 15px; cursor:pointer; border-color: #ed1c24;">포획률 계산기</button>
        <button data-tab="external-links" style="padding: 10px 15px; cursor:pointer; border-color: #2196f3;">외부 링크</button>
      </nav>

      <main id="tab-content" style="background: var(--bg-color); min-height: 400px; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- 선택된 탭(feature)의 화면이 렌더링될 자리 -->
      </main>
    </div>
  `;

  // 3. 다크모드 및 전역 상태 연동
  globalStore.subscribe((state: AppState) => {
    if (state.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // 활성 탭 버튼 스타일 업데이트
    const tabs = container.querySelectorAll<HTMLButtonElement>('#tab-menu button');
    tabs.forEach(btn => {
      const isSelected = btn.getAttribute('data-tab') === state.activeTab;
      btn.style.backgroundColor = isSelected ? 'var(--primary-color)' : 'transparent';
      btn.style.color = isSelected ? '#fff' : 'inherit';
      btn.style.border = isSelected ? '1px solid var(--primary-color)' : '1px solid #ccc';
    });
  });

  // 초기 상태 로드시 즉시 반영
  if (globalStore.getState().isDarkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // 4. 탭 라우팅 처리 로직
  const tabContent = container.querySelector<HTMLElement>('#tab-content')!;
  let cleanupCurrentTab: (() => void) | null = null;

  const navigateTo = (tabName: string) => {
    // URL 업데이트 및 전역 상태 업데이트
    updatePath(tabName);
    globalStore.setState({ activeTab: tabName });

    if (cleanupCurrentTab) {
        cleanupCurrentTab();
        cleanupCurrentTab = null;
    }
    tabContent.innerHTML = '';

    switch (tabName) {
      case 'settings':
        cleanupCurrentTab = renderSettings(tabContent);
        break;
      case 'type-calculator':
        cleanupCurrentTab = renderTypeCalculator(tabContent);
        break;
      case 'pokedex':
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
      case 'catch-calculator':
        renderCatchCalculator(tabContent).then(cleanup => {
            cleanupCurrentTab = cleanup;
        });
        break;
      case 'external-links':
        renderExternalLinks(tabContent).then(cleanup => {
            cleanupCurrentTab = cleanup;
        });
        break;
      default:
        tabContent.innerHTML = '<p>아직 연결되지 않은 탭입니다.</p>';
        break;
    }
  };

  // 탭 버튼 클릭 이벤트
  const tabs = container.querySelectorAll<HTMLButtonElement>('#tab-menu button');
  const tabMenu = container.querySelector('#tab-menu') as HTMLElement;
  const hamburgerBtn = container.querySelector('#hamburger-menu-btn') as HTMLElement;

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      if (tabName) navigateTo(tabName);
      // 모바일에서 탭 선택 후 메뉴 닫기
      if (window.innerWidth <= 768) {
          tabMenu.classList.remove('open');
      }
    });
  });

  // 햄버거 버튼 토글
  hamburgerBtn?.addEventListener('click', () => {
    tabMenu.classList.toggle('open');
  });

  // 로고 클릭 시 설정 탭으로
  container.querySelector('#site-logo')?.addEventListener('click', () => navigateTo('settings'));

  // 5. 헤더 버튼 이벤트 바인딩
  const btnSave = container.querySelector('#btn-save') as HTMLButtonElement;
  const btnCopyUrl = container.querySelector('#btn-copy-url') as HTMLButtonElement;

  btnSave.addEventListener('click', () => {
    const state = globalStore.getState();
    saveSettings({
      isDarkMode: state.isDarkMode,
      isCustomMode: state.isCustomMode,
      generation: state.generation,
      externalLinks: getExternalLinks() || undefined
    });
    alert('현재 설정 및 외부 링크가 저장되었습니다. (브라우저를 닫아도 유지됩니다)');
  });

  btnCopyUrl.addEventListener('click', async () => {
    const url = getCurrentStateUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert('현재 URL이 클립보드에 복사되었습니다.');
    } catch (err) {
      alert('클립보드 복사 실패: ' + url);
    }
  });

  // 6. 최초 로드 시 URL에 기반한 탭 표시
  const initialTab = getTabFromPath();
  navigateTo(initialTab);

  // 뒤로가기/앞으로가기 대응
  window.addEventListener('popstate', () => {
    const tab = getTabFromPath();
    navigateTo(tab);
  });
}
