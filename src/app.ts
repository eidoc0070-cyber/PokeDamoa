import { globalStore } from './state/store.js';
import type { AppState } from './state/store.js';
import { loadSettings, saveSettings, getExternalLinks } from './state/storage.js';
import { getTabFromPath, updatePath, getCurrentStateUrl } from './state/url-params.js';
import { renderSettings } from './features/settings/index.js';
import { renderPokedex } from './features/pokedex/index.js';
import { renderCalculatorHub } from './features/calculator/index.js';
import { renderExternalLinks } from './features/external-links/index.js';
import { initPwaBanner } from './components/PwaBanner.js';

/**
 * 애플리케이션의 메인 레이아웃 및 탭 라우팅을 초기화합니다.
 */
export function initApp(container: HTMLElement) {
  // 1. 기본 레이아웃 골격 생성
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
        <!-- 탭 버튼이 동적으로 렌더링될 자리 -->
      </nav>

      <main id="tab-content" style="background: var(--bg-color); min-height: 400px; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- 선택된 탭(feature)의 화면이 렌더링될 자리 -->
      </main>
    </div>
  `;

  const tabMenu = container.querySelector('#tab-menu') as HTMLElement;
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
      case 'pokedex':
        renderPokedex(tabContent).then(cleanup => { cleanupCurrentTab = cleanup; });
        break;
      case 'calculator':
        renderCalculatorHub(tabContent).then(cleanup => { cleanupCurrentTab = cleanup; });
        break;
      case 'external-links':
        renderExternalLinks(tabContent).then(cleanup => { cleanupCurrentTab = cleanup; });
        break;
      default:
        tabContent.innerHTML = '<p>아직 연결되지 않은 탭입니다.</p>';
        break;
    }
  };

  // 탭 메뉴 렌더링 함수
  const renderTabs = (state: AppState) => {
    if (state.isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    const visibleTabs = state.tabs.filter(t => t.isVisible);
    tabMenu.innerHTML = visibleTabs.map(tab => `
        <button data-tab="${tab.id}" style="padding: 10px 15px; cursor:pointer; font-weight: ${tab.id === 'settings' ? 'bold' : 'normal'}; border-radius: 4px; transition: all 0.2s;">
            ${tab.currentName}
        </button>
    `).join('');

    const buttons = tabMenu.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach(btn => {
      const tabId = btn.getAttribute('data-tab')!;
      const isSelected = tabId === state.activeTab;
      
      btn.style.backgroundColor = isSelected ? 'var(--primary-color)' : 'transparent';
      btn.style.color = isSelected ? '#fff' : 'inherit';
      btn.style.border = isSelected ? '1px solid var(--primary-color)' : '1px solid #ccc';

      btn.onclick = () => {
        navigateTo(tabId);
        if (window.innerWidth <= 768) {
            tabMenu.classList.remove('open');
        }
      };
    });
  };

  // 3. 전역 상태 연동
  globalStore.subscribe(renderTabs);

  // 1. 초기 상태 로드 (LocalStorage) 및 반영
  const saved = loadSettings();
  if (saved) {
    // 탭 마이그레이션 로직
    let hasOldCalculators = false;
    const oldCalcIds = ['damage-calculator', 'stat-calculator', 'type-calculator', 'catch-calculator'];
    
    let updatedTabs = (saved.tabs || globalStore.getState().tabs).filter(tab => {
        if (oldCalcIds.includes(tab.id)) {
            hasOldCalculators = true;
            return false; // 구형 계산기 제거
        }
        return true;
    });

    // 신규 통합 계산기 탭이 없으면 추가
    if (hasOldCalculators && !updatedTabs.find(t => t.id === 'calculator')) {
        const pokedexIndex = updatedTabs.findIndex(t => t.id === 'pokedex');
        const newCalcTab = { id: 'calculator', currentName: '🧮 계산기', isVisible: true, isCustomized: false };
        if (pokedexIndex !== -1) {
            updatedTabs.splice(pokedexIndex + 1, 0, newCalcTab);
        } else {
            updatedTabs.unshift(newCalcTab);
        }
    }

    // 기존 Pokedex 이름 마이그레이션
    updatedTabs = updatedTabs.map(tab => {
        const isDefaultName = tab.currentName.includes('포켓몬 도감') || tab.currentName === '📕 포켓몬 도감';
        if (tab.id === 'pokedex' && tab.isCustomized !== true && isDefaultName) {
            return { ...tab, currentName: '📚 정보 도감', isCustomized: false };
        }
        return tab;
    });

    globalStore.setState({
      isDarkMode: saved.isDarkMode,
      isCustomMode: saved.isCustomMode,
      generation: saved.generation,
      tabs: updatedTabs,
      visitCount: (saved.visitCount || 0) + 1,
      pwaGuideDismissed: saved.pwaGuideDismissed || false
    });
  } else {
    globalStore.setState({ visitCount: 1 });
  }

  // 변경된 방문 횟수 즉시 저장
  const currentState = globalStore.getState();
  saveSettings({
    isDarkMode: currentState.isDarkMode,
    isCustomMode: currentState.isCustomMode,
    generation: currentState.generation,
    tabs: currentState.tabs,
    visitCount: currentState.visitCount,
    pwaGuideDismissed: currentState.pwaGuideDismissed
  });

  // PWA 배너 초기화
  initPwaBanner(container);
  
  // 최초 렌더링 강제 실행
  renderTabs(globalStore.getState());

  // 햄버거 버튼 토글
  const hamburgerBtn = container.querySelector('#hamburger-menu-btn') as HTMLElement;
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
      tabs: state.tabs,
      visitCount: state.visitCount,
      pwaGuideDismissed: state.pwaGuideDismissed,
      externalLinks: getExternalLinks() || undefined
    });
    alert('설정이 저장되었습니다.');
  });

  btnCopyUrl.addEventListener('click', async () => {
    const url = getCurrentStateUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert('URL이 클립보드에 복사되었습니다.');
    } catch (err) {
      alert('URL 복사 실패');
    }
  });

  // 6. 최초 로드 시 URL에 기반한 탭 표시
  let initialTab = getTabFromPath();
  
  // 구형 URL 리다이렉션 처리
  const oldCalcToSub: Record<string, string> = {
    'stat-calculator': 'stat',
    'damage-calculator': 'damage',
    'type-calculator': 'type',
    'catch-calculator': 'catch'
  };

  if (oldCalcToSub[initialTab]) {
    sessionStorage.setItem('calculator_active_subtab', oldCalcToSub[initialTab]);
    initialTab = 'calculator';
  }

  const currentTabs = globalStore.getState().tabs;
  const targetTab = currentTabs.find(t => t.id === initialTab);

  if (targetTab && !targetTab.isVisible) {
      if (confirm(`현재 설정에 없는 [${targetTab.currentName}] 탭 링크로 접속하셨습니다. 이 기능을 상단 탭에 추가할까요?`)) {
          const newTabs = currentTabs.map(t => t.id === initialTab ? { ...t, isVisible: true } : t);
          globalStore.setState({ tabs: newTabs });
          saveSettings({ ...globalStore.getState(), tabs: newTabs });
      } else {
          // '아니오' 클릭 시: 이번 접속에 한해서만 임시로 해당 탭을 상단 바 끝에 표시
          const target = currentTabs.find(t => t.id === initialTab);
          if (target) {
              const otherTabs = currentTabs.filter(t => t.id !== initialTab);
              globalStore.setState({ tabs: [...otherTabs, { ...target, isVisible: true }] });
          }
      }
  }

  navigateTo(initialTab);

  window.addEventListener('popstate', () => {
    navigateTo(getTabFromPath());
  });
}
