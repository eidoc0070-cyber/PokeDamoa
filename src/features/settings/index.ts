import { globalStore } from '../../state/store.js';
import type { AppState } from '../../state/store.js';
import { saveSettings, getExternalLinks, DEFAULT_TABS } from '../../state/storage.js';
import type { TabItem } from '../../state/storage.js';
import { forceShowPwaBanner } from '../../components/PwaBanner.js';

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
              <option value="8">8세대 (Sword / Shield)</option>
              <option value="7">7세대 (Sun / Moon)</option>
              <option value="6">6세대 (X / Y)</option>
              <option value="5">5세대 (Black / White)</option>
              <option value="4">4세대 (Diamond / Pearl)</option>
              <option value="3">3세대 (Ruby / Sapphire)</option>
              <option value="2">2세대 (Gold / Silver)</option>
              <option value="1">1세대 (Red / Blue)</option>
              <option value="champions">Champions</option>
            </select>
          </label>
          <p class="setting-desc" style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">
            모든 계산기 및 속성이 여기서 선택한 세대를 기준으로 동작합니다.
          </p>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <h3 class="card-title" style="color:var(--secondary-color);">하단 탭 메뉴 관리</h3>
        <p style="margin-bottom:15px; font-size:0.9rem; color:var(--text-muted);">하단 내비게이션 바에 표시될 탭의 이름과 순서, 노출 여부를 관리합니다.</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button id="btn-open-tab-manager" class="btn btn-primary" style="width: 100%;">
                하단 탭 설정 관리자 열기
            </button>
            <button id="btn-show-pwa-guide" class="btn" style="width: 100%;">
                PWA 앱 설치 안내
            </button>
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
  const btnOpenTabManager = container.querySelector<HTMLButtonElement>('#btn-open-tab-manager')!;
  const btnShowPwaGuide = container.querySelector<HTMLButtonElement>('#btn-show-pwa-guide')!;
  
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
        generation: newState.generation,
        tabs: newState.tabs,
        visitCount: newState.visitCount,
        pwaGuideDismissed: newState.pwaGuideDismissed
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
    const parsed = isNaN(Number(val)) ? val : Number(val);
    syncAndSave({ generation: parsed as any });
  });

  // 탭 관리자 모달 열기
  btnOpenTabManager.addEventListener('click', () => {
    renderTabManagerModal();
  });

  // PWA 안내 가이드 표시
  btnShowPwaGuide.addEventListener('click', () => {
    forceShowPwaBanner();
  });

  // 내보내기 / 가져오기
  btnExport.addEventListener('click', async () => {
    const s = globalStore.getState();
    const config = {
        isDarkMode: s.isDarkMode,
        isCustomMode: s.isCustomMode,
        generation: s.generation,
        tabs: s.tabs,
        externalLinks: getExternalLinks() // 외부 링크 데이터 포함
    };
    try {
        await navigator.clipboard.writeText(JSON.stringify(config));
        alert('설정 및 상단 탭, 외부 링크 데이터가 클립보드에 복사되었습니다.');
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
            
            // 전역 스토어 업데이트
            globalStore.setState({
                isDarkMode: config.isDarkMode,
                isCustomMode: config.isCustomMode,
                generation: config.generation,
                tabs: config.tabs || globalStore.getState().tabs
            });
            
            alert('설정과 상단 탭, 외부 링크가 성공적으로 적용되었습니다.');
            window.location.reload(); 
        } catch (e) {
            alert('올바르지 않은 설정 데이터 형식입니다.');
        }
    }
  });

  function renderTabManagerModal() {
    const overlay = document.createElement('div');
    overlay.id = 'tab-manager-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 9999; backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--bg-color, #fff); width: 90%; max-width: 500px; max-height: 80vh;
        border-radius: 12px; padding: 25px; display: flex; flex-direction: column; gap: 20px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative; overflow: hidden;
    `;

    let currentTabs = [...globalStore.getState().tabs];

    const updateUI = () => {
        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0;">하단 탭 설정</h2>
                <button id="modal-close" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <p style="color:#666; font-size:0.9rem; margin:0;">드래그하여 순서를 변경하고, 이름을 수정하거나 숨길 수 있습니다.</p>
            
            <div id="modal-tab-list" style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; padding-right:5px;">
                ${currentTabs.map((tab, index) => {
                    const isSettings = tab.id === 'settings';
                    return `
                        <div class="modal-tab-item" data-id="${tab.id}" data-index="${index}" style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid #eee; border-radius:8px; background: ${tab.isVisible ? 'transparent' : 'rgba(0,0,0,0.05)'}; transition: background 0.2s;">
                            <div class="drag-handle" style="cursor:grab; color:#ccc; font-size:1.2rem; user-select:none; padding:0 5px;">☰</div>
                            <input type="checkbox" class="tab-visibility" data-id="${tab.id}" ${tab.isVisible || isSettings ? 'checked' : ''} ${isSettings ? 'disabled' : ''} style="width:18px; height:18px; cursor:pointer;" />
                            <input type="text" class="tab-name-input" data-id="${tab.id}" value="${tab.currentName}" ${isSettings ? 'readonly' : ''} style="flex:1; padding:6px 10px; border:1px solid #ddd; border-radius:4px; font-size:0.95rem; ${!tab.isVisible && !isSettings ? 'color:#999; background:#f9f9f9;' : ''} ${isSettings ? 'background:#f0f0f0; border-color:#ccc; cursor:not-allowed;' : ''}" />
                            ${isSettings ? '<span style="font-size:0.8rem; color:#999; white-space:nowrap;">(필수)</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:15px; border-top:1px solid #eee;">
                <button id="btn-reset-tabs" style="background:none; border:none; color:#d32f2f; cursor:pointer; font-size:0.9rem; text-decoration:underline;">기본값으로 초기화</button>
                <div style="display:flex; gap:10px;">
                    <button id="btn-modal-cancel" style="padding:10px 18px; background:#f5f5f5; border:1px solid #ddd; border-radius:6px; cursor:pointer; font-weight:bold;">취소</button>
                    <button id="btn-modal-save" style="padding:10px 18px; background:#4caf50; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">저장 및 적용</button>
                </div>
            </div>
        `;
        attachModalEvents();
    };

    const attachModalEvents = () => {
        modal.querySelector('#modal-close')?.addEventListener('click', () => overlay.remove());
        modal.querySelector('#btn-modal-cancel')?.addEventListener('click', () => overlay.remove());
        
        modal.querySelector('#btn-modal-save')?.addEventListener('click', () => {
            syncAndSave({ tabs: currentTabs });
            overlay.remove();
        });

        modal.querySelector('#btn-reset-tabs')?.addEventListener('click', () => {
            if (confirm('하단 탭 설정이 초기 상태로 돌아갑니다. 계속하시겠습니까?')) {
                currentTabs = [...DEFAULT_TABS];
                updateUI();
            }
        });

        // 가시성 토글
        modal.querySelectorAll('.tab-visibility').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = (e.target as HTMLInputElement).getAttribute('data-id');
                const isVisible = (e.target as HTMLInputElement).checked;
                const tab = currentTabs.find(t => t.id === id);
                if (tab) {
                    tab.isVisible = isVisible;
                    tab.isCustomized = true; // 수정됨 표시
                    updateUI(); // 스타일 갱신 위해 재렌더링
                }
            });
        });

        // 이름 수정
        modal.querySelectorAll('.tab-name-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = (e.target as HTMLInputElement).getAttribute('data-id');
                const value = (e.target as HTMLInputElement).value;
                const tab = currentTabs.find(t => t.id === id);
                if (tab) {
                    tab.currentName = value;
                    tab.isCustomized = true; // 수정됨 표시
                }
            });
        });

        // 드래그 앤 드롭
        let draggedIndex: number | null = null;
        const items = modal.querySelectorAll('.modal-tab-item');
        
        items.forEach(item => {
            const handle = item.querySelector('.drag-handle') as HTMLElement;
            handle.addEventListener('mousedown', () => {
                (item as HTMLElement).setAttribute('draggable', 'true');
            });

            const resetDraggable = () => {
                (item as HTMLElement).setAttribute('draggable', 'false');
            };

            item.addEventListener('dragstart', (e) => {
                draggedIndex = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0');
                (e.currentTarget as HTMLElement).style.opacity = '0.4';
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetIndex = parseInt((e.currentTarget as HTMLElement).getAttribute('data-index') || '0');
                if (draggedIndex !== null && draggedIndex !== targetIndex) {
                    const draggedTab = currentTabs[draggedIndex];
                    if (draggedTab) {
                        currentTabs.splice(draggedIndex, 1);
                        currentTabs.splice(targetIndex, 0, draggedTab);
                        
                        // 순서 변경도 커스터마이징으로 간주
                        currentTabs.forEach(t => t.isCustomized = true);
                        
                        updateUI();
                    }
                }
            });

            item.addEventListener('dragend', (e) => {
                (e.currentTarget as HTMLElement).style.opacity = '1';
                draggedIndex = null;
                resetDraggable();
            });

            item.addEventListener('mouseup', resetDraggable);
        });
    };

    updateUI();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // ESC 키로 닫기
    const escListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
  }

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
