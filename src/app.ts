import { initPwaBanner } from "./components/PwaBanner.js";
import { renderBattleAi } from "./features/battle-ai/index.js";
import { renderCalculatorHub } from "./features/calculator/index.js";
import { renderExternalLinks } from "./features/external-links/index.js";
import { renderPartyBuilder } from "./features/party-builder/index.js";
import { renderPokedex } from "./features/pokedex/index.js";
import { renderSettings } from "./features/settings/index.js";
import type { TabItem } from "./state/storage.js";
import { DEFAULT_TABS, getExternalLinks, loadSettings, saveSettings } from "./state/storage.js";
import type { AppState } from "./state/store.js";
import { globalStore } from "./state/store.js";
import { getCurrentStateUrl, getTabFromPath, updatePath } from "./state/url-params.js";

// 탭 ID에 따른 아이콘 매핑
const TAB_ICONS: Record<string, string> = {
    pokedex: "📚",
    "party-builder": "🏟️",
    calculator: "🧮",
    "battle-ai": "🥊",
    "external-links": "🔗",
    settings: "⚙️",
};

/**
 * 애플리케이션의 메인 레이아웃 및 탭 라우팅을 초기화합니다.
 */
export function initApp(container: HTMLElement) {
    // 1. 기본 모바일 레이아웃 골격 생성 (Mobile First)
    container.innerHTML = `
    <header class="app-header">
      <h1 class="app-title" id="site-logo" style="cursor:pointer;">
        PokéDamoa
      </h1>
      <div class="header-actions">
        <button id="btn-save" class="btn btn-icon" title="저장">💾</button>
        <button id="btn-copy-url" class="btn btn-icon" title="URL 복사">🔗</button>
      </div>
    </header>
    
    <main class="app-main" id="app-main">
      <!-- 선택된 탭(feature)의 화면이 렌더링될 자리 -->
    </main>

    <nav class="bottom-nav" id="bottom-nav">
      <!-- 하단 탭 버튼이 동적으로 렌더링될 자리 -->
    </nav>
  `;

    const bottomNav = container.querySelector("#bottom-nav") as HTMLElement;
    const appMain = container.querySelector<HTMLElement>("#app-main")!;
    let cleanupCurrentTab: (() => void) | null = null;

    const navigateTo = (tabName: string, subTab?: string) => {
        // URL 업데이트 및 전역 상태 업데이트
        updatePath(tabName, subTab);
        globalStore.setState({ activeTab: tabName });

        if (cleanupCurrentTab) {
            cleanupCurrentTab();
            cleanupCurrentTab = null;
        }
        appMain.innerHTML = "";

        switch (tabName) {
            case "settings":
                cleanupCurrentTab = renderSettings(appMain);
                break;
            case "pokedex":
                renderPokedex(appMain, subTab).then((cleanup) => {
                    cleanupCurrentTab = cleanup;
                });
                break;
            case "calculator":
                renderCalculatorHub(appMain, subTab).then((cleanup) => {
                    cleanupCurrentTab = cleanup;
                });
                break;
            case "party-builder":
                renderPartyBuilder(appMain).then((cleanup) => {
                    cleanupCurrentTab = cleanup;
                });
                break;
            case "battle-ai":
                renderBattleAi(appMain).then((cleanup) => {
                    cleanupCurrentTab = cleanup;
                });
                break;
            case "external-links":
                renderExternalLinks(appMain).then((cleanup) => {
                    cleanupCurrentTab = cleanup;
                });
                break;
            default:
                appMain.innerHTML = '<div class="card"><p class="text-center">아직 연결되지 않은 탭입니다.</p></div>';
                break;
        }

        // 네비게이션 이동 후 스크롤 최상단으로 이동
        appMain.scrollTo(0, 0);
    };

    // 탭 메뉴 렌더링 함수
    const renderTabs = (state: AppState) => {
        // 다크모드 테마 적용
        if (state.isDarkMode) {
            document.documentElement.setAttribute("data-theme", "dark");
            const meta = document.getElementById("theme-color-meta");
            if (meta) meta.setAttribute("content", "#121212");
        } else {
            document.documentElement.removeAttribute("data-theme");
            const meta = document.getElementById("theme-color-meta");
            if (meta) meta.setAttribute("content", "#ffffff");
        }

        const visibleTabs = state.tabs.filter((t) => t.isVisible);

        // 하단 탭 렌더링
        bottomNav.innerHTML = visibleTabs
            .map((tab) => {
                const icon = TAB_ICONS[tab.id] || "📌";
                // 설정에서 이모지를 제외한 순수 이름만 추출 시도 (예: "🧮 계산기" -> "계산기")
                const nameWithoutEmoji = tab.currentName
                    .replace(
                        /^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]\s*/g,
                        "",
                    )
                    .trim();
                const isActive = tab.id === state.activeTab ? "active" : "";

                return `
        <button class="bottom-nav-item ${isActive}" data-tab="${tab.id}">
          <span class="icon">${icon}</span>
          <span class="label">${nameWithoutEmoji}</span>
        </button>
      `;
            })
            .join("");

        const buttons = bottomNav.querySelectorAll<HTMLButtonElement>(".bottom-nav-item");
        buttons.forEach((btn) => {
            btn.onclick = () => {
                const tabId = btn.getAttribute("data-tab")!;
                if (tabId !== state.activeTab) {
                    navigateTo(tabId);
                }
            };
        });
    };

    // 전역 상태 연동
    globalStore.subscribe(renderTabs);

    // 초기 상태 로드 (LocalStorage) 및 반영
    const saved = loadSettings();
    if (saved) {
        // 1. 기존 탭 데이터 가져오기
        let userTabs = saved.tabs || [...globalStore.getState().tabs];

        // 2. 구버전 계산기 ID 처리 (제거 및 플래그 설정)
        const oldCalcIds = ["damage-calculator", "stat-calculator", "type-calculator", "catch-calculator"];
        const hasOldCalculators = userTabs.some((t) => oldCalcIds.includes(t.id));
        userTabs = userTabs.filter((t) => !oldCalcIds.includes(t.id));

        // 3. DEFAULT_TABS를 기준으로 동기화 (마이그레이션 핵심)
        let finalTabs: TabItem[] = [...userTabs];

        // 누락된 탭 추가 (순서 유지하며 삽입)
        DEFAULT_TABS.forEach((defTab, index) => {
            const exists = finalTabs.some((t) => t.id === defTab.id);
            if (!exists) {
                finalTabs.splice(index, 0, { ...defTab });
            }
        });

        // 커스터마이징 안 된 탭들 최신화 (이름, 아이콘 등)
        finalTabs = finalTabs.map((tab) => {
            const defTab = DEFAULT_TABS.find((t) => t.id === tab.id);
            if (defTab && !tab.isCustomized) {
                // 사용자가 수정한 적이 없다면 기본값으로 덮어씀 (이름, 아이콘, 기본 가시성 등)
                return { ...defTab };
            }
            return tab;
        });

        // 유효하지 않은 탭 제거 (DEFAULT_TABS에 없는 ID인 경우)
        finalTabs = finalTabs.filter((tab) => DEFAULT_TABS.some((t) => t.id === tab.id));

        // 구버전 계산기 사용자라면 계산기 탭 강제 노출
        if (hasOldCalculators) {
            const calcTab = finalTabs.find((t) => t.id === "calculator");
            if (calcTab) calcTab.isVisible = true;
        }

        globalStore.setState({
            isDarkMode: saved.isDarkMode,
            isCustomMode: saved.isCustomMode,
            generation: saved.generation,
            tabs: finalTabs,
            visitCount: (saved.visitCount || 0) + 1,
            pwaGuideDismissed: saved.pwaGuideDismissed || false,
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
        pwaGuideDismissed: currentState.pwaGuideDismissed,
    });

    // PWA 배너 초기화
    initPwaBanner(container);

    // 최초 렌더링 강제 실행
    renderTabs(globalStore.getState());

    // 로고 클릭 시 설정 탭으로
    container.querySelector("#site-logo")?.addEventListener("click", () => navigateTo("settings"));

    // 헤더 버튼 이벤트 바인딩
    const btnSave = container.querySelector("#btn-save") as HTMLButtonElement;
    const btnCopyUrl = container.querySelector("#btn-copy-url") as HTMLButtonElement;

    btnSave.addEventListener("click", () => {
        const state = globalStore.getState();
        saveSettings({
            isDarkMode: state.isDarkMode,
            isCustomMode: state.isCustomMode,
            generation: state.generation,
            tabs: state.tabs,
            visitCount: state.visitCount,
            pwaGuideDismissed: state.pwaGuideDismissed,
            externalLinks: getExternalLinks() || undefined,
        });
        alert("설정이 저장되었습니다.");
    });

    btnCopyUrl.addEventListener("click", async () => {
        const url = getCurrentStateUrl();
        try {
            await navigator.clipboard.writeText(url);
            alert("URL이 클립보드에 복사되었습니다.");
        } catch (_err) {
            alert("URL 복사 실패");
        }
    });

    // 최초 로드 시 URL에 기반한 탭 표시
    let { mainTab: initialTab, subTab: initialSubTab } = getTabFromPath();

    const oldCalcToSub: Record<string, string> = {
        "stat-calculator": "stat",
        "damage-calculator": "damage",
        "type-calculator": "type",
        "catch-calculator": "catch",
    };

    if (oldCalcToSub[initialTab]) {
        initialSubTab = oldCalcToSub[initialTab];
        initialTab = "calculator";
    }

    const currentTabs = globalStore.getState().tabs;
    const targetTab = currentTabs.find((t) => t.id === initialTab);

    if (targetTab && !targetTab.isVisible) {
        if (confirm(`현재 설정에 없는 [${targetTab.currentName}] 탭 링크로 접속하셨습니다. 이 기능을 활성화할까요?`)) {
            const newTabs = currentTabs.map((t) => (t.id === initialTab ? { ...t, isVisible: true } : t));
            globalStore.setState({ tabs: newTabs });
            saveSettings({ ...globalStore.getState(), tabs: newTabs });
        } else {
            const target = currentTabs.find((t) => t.id === initialTab);
            if (target) {
                const otherTabs = currentTabs.filter((t) => t.id !== initialTab);
                globalStore.setState({ tabs: [...otherTabs, { ...target, isVisible: true }] });
            }
        }
    }

    navigateTo(initialTab, initialSubTab);

    window.addEventListener("popstate", () => {
        const { mainTab, subTab } = getTabFromPath();
        navigateTo(mainTab, subTab);
    });
}
