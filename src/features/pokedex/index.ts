import { renderPokemonList } from './sub-features/pokemon-list.js';
import { renderMoveList } from './sub-features/move-list.js';
import { renderAbilityList } from './sub-features/ability-list.js';
import { renderItemList } from './sub-features/item-list.js';
import { renderFieldList } from './sub-features/field-list.js';
import { updatePath } from '../../state/url-params.js';

type SubTab = 'pokemon' | 'move' | 'ability' | 'item' | 'field';

export async function renderPokedex(container: HTMLElement, initialSubTab?: string): Promise<() => void> {
    let currentCleanup: (() => void) | null = null;
    
    // 우선순위: URL 파라미터 > 세션스토리지 > 기본값('pokemon')
    let activeSubTab: SubTab = (initialSubTab as SubTab) || (sessionStorage.getItem('pokedex_active_subtab') as SubTab) || 'pokemon';
    
    // 유효하지 않은 서브탭이면 기본값으로
    const validTabs: SubTab[] = ['pokemon', 'move', 'ability', 'item', 'field'];
    if (!validTabs.includes(activeSubTab)) activeSubTab = 'pokemon';

    container.innerHTML = `
        <div class="pokedex-hub">
            <div class="sub-tab-menu" style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch;">
                <button data-subtab="pokemon" class="sub-tab-btn">포켓몬</button>
                <button data-subtab="move" class="sub-tab-btn">기술</button>
                <button data-subtab="ability" class="sub-tab-btn">특성</button>
                <button data-subtab="item" class="sub-tab-btn">아이템</button>
                <button data-subtab="field" class="sub-tab-btn">필드</button>
            </div>
            <div id="sub-tab-content"></div>
        </div>
        <style>
            .sub-tab-btn {
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: var(--bg-color, #fff);
                color: var(--text-color, #333);
                border-radius: 20px;
                cursor: pointer;
                white-space: nowrap;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            .sub-tab-btn.active {
                background: var(--primary-color, #1976d2);
                color: #fff;
                border-color: var(--primary-color, #1976d2);
                font-weight: bold;
            }
            .pokedex-hub .sub-tab-menu::-webkit-scrollbar {
                height: 4px;
            }
            .pokedex-hub .sub-tab-menu::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 2px;
            }
        </style>
    `;

    const contentEl = container.querySelector('#sub-tab-content') as HTMLElement;
    const buttons = container.querySelectorAll<HTMLButtonElement>('.sub-tab-btn');

    const switchSubTab = async (tab: SubTab, updateUrl = true) => {
        if (currentCleanup) currentCleanup();
        activeSubTab = tab;
        sessionStorage.setItem('pokedex_active_subtab', tab);
        
        if (updateUrl) {
            updatePath('pokedex', tab);
        }

        // UI 업데이트
        buttons.forEach(btn => {
            if (btn.dataset.subtab === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        contentEl.innerHTML = '';
        
        switch (tab) {
            case 'pokemon':
                currentCleanup = await renderPokemonList(contentEl);
                break;
            case 'move':
                currentCleanup = await renderMoveList(contentEl);
                break;
            case 'ability':
                currentCleanup = await renderAbilityList(contentEl);
                break;
            case 'item':
                currentCleanup = await renderItemList(contentEl);
                break;
            case 'field':
                currentCleanup = await renderFieldList(contentEl);
                break;
        }
    };

    buttons.forEach(btn => {
        btn.onclick = () => switchSubTab(btn.dataset.subtab as SubTab);
    });

    // 초기 탭 로드 (최초 로드 시에는 URL 업데이트 불필요)
    await switchSubTab(activeSubTab, false);

    return () => {
        if (currentCleanup) currentCleanup();
    };
}
