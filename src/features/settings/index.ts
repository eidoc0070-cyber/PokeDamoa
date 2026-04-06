import { globalStore } from '../../state/store.js';
import type { AppState } from '../../state/store.js';

export function renderSettings(container: HTMLElement) {
  container.innerHTML = `
    <div class="settings-container">
      <h2>설정 (Settings)</h2>
      
      <div class="setting-item" style="margin-bottom: 15px;">
        <label style="cursor: pointer; font-size: 1.1rem; font-weight: bold;">
          <input type="checkbox" id="dark-mode-toggle" />
          다크 모드 사용
        </label>
        <p class="setting-desc" style="margin: 5px 0 0 25px; color: #666; font-size: 0.9rem;">
          화면의 배경 및 글자 색상을 어둡게 전환합니다.
        </p>
      </div>

      <div class="setting-item" style="margin-bottom: 15px;">
        <label style="cursor: pointer; font-size: 1.1rem; font-weight: bold;">
          <input type="checkbox" id="custom-mode-toggle" />
          커스텀 모드 (조건제한 해제)
        </label>
        <p class="setting-desc" style="margin: 5px 0 0 25px; color: #666; font-size: 0.9rem;">
          게임 시스템 상 불가능한 종족값이나 스킬 조합 등을 에러 없이 강제로 입력할 수 있게 풀어줍니다.
        </p>
      </div>

      <div class="setting-item" style="margin-bottom: 25px;">
        <label style="font-size: 1.1rem; font-weight: bold;">
          기준 세대 선택:
          <select id="generation-select" style="padding: 5px; font-size: 1rem; margin-left:10px;">
            <option value="9">9세대 (Scarlet / Violet)</option>
            <option value="champions">Champions</option>
          </select>
        </label>
        <p class="setting-desc" style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">
          모든 계산기 및 속성이 여기서 선택한 세대를 기준으로 동작합니다.
        </p>
      </div>
      
      <div class="store-test-feedback" style="padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
        <p style="margin:0; font-family: monospace;">💡 [전역 Store 디버그용 상태] <br/>다크모드: <span id="debug-dark"></span> | 세대: <span id="debug-gen"></span> | 커스텀: <span id="debug-custom"></span></p>
      </div>
    </div>
  `;

  // 엘리먼트를 캐싱합니다.
  const darkModeToggle = container.querySelector<HTMLInputElement>('#dark-mode-toggle')!;
  const customModeToggle = container.querySelector<HTMLInputElement>('#custom-mode-toggle')!;
  const generationSelect = container.querySelector<HTMLSelectElement>('#generation-select')!;
  const debugDark = container.querySelector<HTMLSpanElement>('#debug-dark')!;
  const debugGen = container.querySelector<HTMLSpanElement>('#debug-gen')!;
  const debugCustom = container.querySelector<HTMLSpanElement>('#debug-custom')!;

  // 1. 초기 UI 상태를 스토어에서 가져와 설정합니다.
  const state = globalStore.getState();
  darkModeToggle.checked = state.isDarkMode;
  customModeToggle.checked = state.isCustomMode;
  generationSelect.value = state.generation.toString();

  debugDark.textContent = String(state.isDarkMode);
  debugGen.textContent = String(state.generation);
  debugCustom.textContent = String(state.isCustomMode);

  // 2. 사용자가 UI를 조작하면 Store에 상태를 업데이트합니다.
  darkModeToggle.addEventListener('change', (e) => {
    globalStore.setState({ isDarkMode: (e.target as HTMLInputElement).checked });
  });

  customModeToggle.addEventListener('change', (e) => {
    globalStore.setState({ isCustomMode: (e.target as HTMLInputElement).checked });
  });

  generationSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    globalStore.setState({ generation: val as typeof state.generation });
  });

  // 3. 반대로 Store의 상태가 변경되면 UI를 동기화하는 컴포넌트 구독(리스너) 역할입니다.
  const unsubscribe = globalStore.subscribe((newState: AppState) => {
    if (darkModeToggle.checked !== newState.isDarkMode) {
      darkModeToggle.checked = newState.isDarkMode;
    }
    if (customModeToggle.checked !== newState.isCustomMode) {
      customModeToggle.checked = newState.isCustomMode;
    }
    if (generationSelect.value !== newState.generation.toString()) {
      generationSelect.value = newState.generation.toString();
    }

    // 디버그 레이블 업데이트
    debugDark.textContent = String(newState.isDarkMode);
    debugGen.textContent = String(newState.generation);
    debugCustom.textContent = String(newState.isCustomMode);
  });

  // 컴포넌트 파기 시 구독을 해제하도록 클린업 함수를 반환합니다.
  return () => {
    unsubscribe();
  };
}
