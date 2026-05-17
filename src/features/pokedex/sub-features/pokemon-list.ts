import { fetchPokedexData, fetchAbilitiesData, fetchMovesData } from '../../../data/pokeapi.js';
import type { PokemonData } from '../../../data/pokeapi.js';
import { hangulIncludes } from '../../../utils/hangul.js';
import { globalStore } from '../../../state/store.js';
import { getStatsForGen, getTypesForGen, getAbilitiesForGen } from '../../../utils/pokemon-math.js';
import { createPokemonCard } from '../../../components/PokemonCard.js';
import { renderPokemonModalContent } from '../../../components/PokemonModal.js';
import { createFilterPanelHTML, initFilterPanel } from '../../../components/FilterPanel.js';
import type { FilterState } from '../../../components/FilterPanel.js';

export async function renderPokemonList(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `
        <div class="loading-spinner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px;">
            <div class="spinner" style="border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: var(--primary-color, #1976d2); animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 15px;">포켓몬 데이터를 불러오는 중입니다...</p>
        </div>
    `;

    try {
        const [fullData, abilitiesData, movesData] = await Promise.all([
            fetchPokedexData(),
            fetchAbilitiesData(),
            fetchMovesData()
        ]);

        let filteredData: PokemonData[] = [];
        let pagedData: PokemonData[] = [];
        let currentPage = 1;
        const ITEMS_PER_PAGE = 48;
        
        let filterState: FilterState;

        container.innerHTML = `
            <div id="filter-panel-container">
                ${createFilterPanelHTML(abilitiesData)}
            </div>

            <div id="pokedex-grid" class="pokedex-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px;"></div>
            
            <div id="load-more-container" style="text-align: center; margin: 20px 0; display: none; padding: 20px; color: var(--text-muted);">
                <span class="loading-text">목록을 더 불러오는 중...</span>
            </div>

            <p id="empty-msg" style="text-align:center; color:#888; display:none; padding: 40px;">검색 결과가 없습니다.</p>

            <div id="poke-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;">
                <div style="background:var(--bg-color, #fff); color:var(--text-color, #333); width: 90%; max-width: 400px; border-radius: 12px; padding: 20px; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <button id="modal-close" style="position:absolute; top: 15px; right: 15px; background:none; border:none; font-size: 1.5em; cursor:pointer; color:#888;">&times;</button>
                    <div id="modal-content"></div>
                </div>
            </div>
        `;

        const gridEl = container.querySelector('#pokedex-grid')!;
        const loadMoreContainer = container.querySelector('#load-more-container') as HTMLElement;
        const modal = container.querySelector('#poke-modal') as HTMLElement;
        const modalClose = container.querySelector('#modal-close') as HTMLElement;
        const modalContent = container.querySelector('#modal-content') as HTMLElement;

        const checkLoadMoreVisibility = () => {
            loadMoreContainer.style.display = pagedData.length < filteredData.length ? 'block' : 'none';
        };

        const openModal = (id: number) => {
            const p = fullData.find(x => x.id === id);
            if (!p) return;
            modalContent.innerHTML = renderPokemonModalContent(p, abilitiesData);
            modal.style.display = 'flex';
        };

        const updateList = () => {
            if (!filterState) return;

            const currentGen = globalStore.getState().generation;
            const targetGen = typeof currentGen === 'number' ? currentGen : 9;

            filteredData = fullData.filter(p => {
                if (p.genId > targetGen) return false;
                if (filterState.searchTerm && !hangulIncludes(p.searchKey, filterState.searchTerm)) return false;
                if (!filterState.showAllForms && !p.isDefault) return false;

                const pTypes = getTypesForGen(p, targetGen);
                if (filterState.filterTypes[0] !== 'all' && !pTypes.includes(filterState.filterTypes[0] as any)) return false;
                if (filterState.filterTypes[1] !== 'all' && !pTypes.includes(filterState.filterTypes[1] as any)) return false;

                if (filterState.filterAbility !== 'all') {
                    const pAbilities = getAbilitiesForGen(p, targetGen);
                    if (!pAbilities.some((a: any) => a.id === filterState.filterAbility)) return false;
                }

                if (filterState.filterMove !== 'all') {
                    const learnset = p.learnsets[targetGen] || [];
                    if (!learnset.includes(filterState.filterMove)) return false;
                }

                const pStats = getStatsForGen(p, targetGen) as any;
                for (const statKey in filterState.filterStats) {
                    const val = pStats[statKey];
                    const [min, max] = (filterState.filterStats as any)[statKey];
                    if (val < min || val > max) return false;
                }

                return true;
            });

            currentPage = 1;
            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            gridEl.innerHTML = pagedData.map(createPokemonCard).join('');
            (container.querySelector('#empty-msg') as HTMLElement).style.display = pagedData.length === 0 ? 'block' : 'none';
            checkLoadMoreVisibility();
        };

        const loadMore = () => {
            const nextItems = filteredData.slice(pagedData.length, pagedData.length + ITEMS_PER_PAGE);
            if (nextItems.length > 0) {
                pagedData.push(...nextItems);
                gridEl.insertAdjacentHTML('beforeend', nextItems.map(createPokemonCard).join(''));
                checkLoadMoreVisibility();
            }
        };

        // 필터 패널 초기화
        const filterPanel = initFilterPanel(
            container.querySelector('#filter-panel-container')!,
            movesData,
            (newState) => {
                filterState = newState;
                updateList();
            }
        );
        filterState = filterPanel.getState();

        // IntersectionObserver for Infinite Scroll
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && pagedData.length < filteredData.length) {
                loadMore();
            }
        }, { threshold: 0.1 });
        observer.observe(loadMoreContainer);

        // 이벤트 리스너
        gridEl.addEventListener('click', (e) => {
            const card = (e.target as HTMLElement).closest('.poke-card');
            if (card) openModal(parseInt(card.getAttribute('data-poke-id') || '0'));
        });
        modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

        // 전역 설정 변경 구독
        const unsubscribeStore = globalStore.subscribe(() => {
            updateList();
        });

        updateList();

        return () => {
            unsubscribeStore();
            observer.disconnect();
        };

    } catch(err) {
        container.innerHTML = `<p style="color:red; padding: 20px;">도감 로드 실패: ${err}</p>`;
        return () => {};
    }
}
