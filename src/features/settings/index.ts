import { globalStore } from '../../state/store.js';
import type { AppState } from '../../state/store.js';
import { saveSettings, getExternalLinks } from '../../state/storage.js';

export function renderSettings(container: HTMLElement) {
  container.innerHTML = `
    <div class="settings-container">
      <h2 style="margin-top:0;">설정 (Settings)</h2>
      
      <div style="background:rgba(0,0,0,0.03); padding:20px; border-radius:12px; margin-bottom:20px;">
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

        <div class="setting-item" style="margin-bottom: 5px;">
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
      </div>

      <div style="border-top: 1px solid #eee; padding-top:20px; margin-top:20px;">
        <h3 style="margin-top:0;">데이터 관리</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btn-export-settings" style="padding:10px 15px; background:#673ab7; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">설정 내보내기</button>
            <button id="btn-import-settings" style="padding:10px 15px; background:#ff9800; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">설정 가져오기</button>
        </div>
        <p style="color:#888; font-size:0.85rem; margin-top:10px;">* 설정값을 텍스트로 복사하거나, 복사한 설정값을 붙여넣어 복원할 수 있습니다.</p>
      </div>
      
      <div class="store-test-feedback" style="margin-top:30px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px;">
        <p style="margin:0; font-family: monospace;">💡 [전역 Store 디버그용 상태] <br/>다크모드: <span id="debug-dark"></span> | 세대: <span id="debug-gen"></span> | 커스텀: <span id="debug-custom"></span></p>
      </div>
    </div>
  `;

  // 엘리먼트를 캐싱합니다.
  const darkModeToggle = container.querySelector<HTMLInputElement>('#dark-mode-toggle')!;
  const customModeToggle = container.querySelector<HTMLInputElement>('#custom-mode-toggle')!;
  const generationSelect = container.querySelector<HTMLSelectElement>('#generation-select')!;
  const btnExport = container.querySelector<HTMLButtonElement>('#btn-export-settings')!;
  const btnImport = container.querySelector<HTMLButtonElement>('#btn-import-settings')!;
  
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

  // 공통 저장 로직
  const syncAndSave = (updates: Partial<AppState>) => {
    globalStore.setState(updates);
    const newState = globalStore.getState();
    saveSettings({
        isDarkMode: newState.isDarkMode,
        isCustomMode: newState.isCustomMode,
        generation: newState.generation
    });
  };

  // 2. 사용자가 UI를 조작하면 Store에 상태를 업데이트합니다.
  darkModeToggle.addEventListener('change', (e) => {
    syncAndSave({ isDarkMode: (e.target as HTMLInputElement).checked });
  });

  customModeToggle.addEventListener('change', (e) => {
    syncAndSave({ isCustomMode: (e.target as HTMLInputElement).checked });
  });

  generationSelect.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    syncAndSave({ generation: val as typeof state.generation });
  });

  // 내보내기 / 가져오기
  btnExport.addEventListener('click', async () => {
    const s = globalStore.getState();
    const config = {
        isDarkMode: s.isDarkMode,
        isCustomMode: s.isCustomMode,
        generation: s.generation,
        externalLinks: getExternalLinks() // 외부 링크 데이터 포함
    };
    try {
        await navigator.clipboard.writeText(JSON.stringify(config));
        alert('설정 및 외부 링크 데이터가 클립보드에 복사되었습니다.');
    } catch (err) {
        alert('복사 실패');
    }
  });

  btnImport.addEventListener('click', () => {
    const text = prompt('내보냈던 설정 데이터를 입력해주세요:');
    if (text) {
        try {
            const config = JSON.parse(text);
            // 전체 저장 함수 호출 (외부 링크 포함)
            saveSettings(config);
            
            // 전역 스토어 업데이트 (코어 설정만)
            globalStore.setState({
                isDarkMode: config.isDarkMode,
                isCustomMode: config.isCustomMode,
                generation: config.generation
            });
            
            alert('설정과 외부 링크가 성공적으로 적용되었습니다.');
            window.location.reload(); 
        } catch (e) {
            alert('올바르지 않은 설정 데이터 형식입니다.');
        }
    }
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
