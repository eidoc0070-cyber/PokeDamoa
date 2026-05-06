import { fetchPokedexData, fetchAbilitiesData, fetchMovesData } from '../../../data/pokeapi.js';
import type { PokemonData, AbilityData, MoveData } from '../../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO, POKEMON_TYPES } from '../../../data/constants.js';
import type { PokemonType } from '../../../data/constants.js';
import { hangulIncludes } from '../../../utils/hangul.js';
import { globalStore } from '../../../state/store.js';
import { getStatsForGen, getTypesForGen, getAbilitiesForGen } from '../../../utils/pokemon-math.js';
import { createAutocomplete } from '../../../components/SearchAutocomplete.js';

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
        
        // 필터 상태
        let searchTerm = '';
        let showAllForms = false;
        let filterTypes: (string | 'all')[] = ['all', 'all'];
        let filterAbility: number | 'all' = 'all';
        let filterMove: number | 'all' = 'all';
        let filterStats = {
            hp: [0, 255], atk: [0, 255], def: [0, 255],
            spa: [0, 255], spd: [0, 255], spe: [0, 255]
        };

        container.innerHTML = `
            <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display:flex; justify-content: space-between; align-items:center; flex-wrap: wrap; gap: 10px; margin-bottom:10px;">
                    <div style="flex: 1; min-width: 200px;">
                        <input type="text" id="poke-search" placeholder="이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <label style="cursor: pointer; font-size: 0.9em; user-select: none;">
                            <input type="checkbox" id="poke-forms" /> 다양한 폼 모두 보기
                        </label>
                        <button id="btn-toggle-filter" style="padding: 8px 15px; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight:bold;">
                            고급 필터 🔍
                        </button>
                    </div>
                </div>

                <div id="advanced-filter-panel" style="display:none; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div>
                            <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">타입 필터</label>
                            <div style="display:flex; gap:5px;">
                                <select id="filter-type1" style="flex:1; padding:5px; border-radius:4px; border:1px solid #ccc;">
                                    <option value="all">타입 1 (전체)</option>
                                    ${POKEMON_TYPES.map(t => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join('')}
                                </select>
                                <select id="filter-type2" style="flex:1; padding:5px; border-radius:4px; border:1px solid #ccc;">
                                    <option value="all">타입 2 (전체)</option>
                                    ${POKEMON_TYPES.map(t => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">특성 필터</label>
                            <select id="filter-ability" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;">
                                <option value="all">특성 선택 (전체)</option>
                                ${abilitiesData.sort((a,b) => a.nameKo.localeCompare(b.nameKo)).map(a => `<option value="${a.id}">${a.nameKo}</option>`).join('')}
                            </select>
                        </div>
                        <div id="filter-move-container">
                            <!-- 기술 자동완성이 들어갈 곳 -->
                        </div>
                    </div>

                    <div style="margin-top:15px;">
                        <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:10px;">종족값 범위 필터</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                            ${['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(s => `
                                <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem;">
                                    <span style="width:30px; font-weight:bold;">${s.toUpperCase()}</span>
                                    <input type="number" class="stat-min" data-stat="${s}" placeholder="Min" style="width:45px; padding:3px; border:1px solid #ccc; border-radius:4px;" />
                                    ~
                                    <input type="number" class="stat-max" data-stat="${s}" placeholder="Max" style="width:45px; padding:3px; border:1px solid #ccc; border-radius:4px;" />
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="margin-top:15px; text-align:right;">
                        <button id="btn-reset-filter" style="padding: 5px 12px; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">필터 초기화</button>
                    </div>
                </div>
            </div>

            <div id="pokedex-grid" class="pokedex-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px;"></div>
            
            <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                <button id="btn-load-more" style="background: var(--primary-color, #1976d2); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">더 보기</button>
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
        const searchInput = container.querySelector('#poke-search') as HTMLInputElement;
        const formCheck = container.querySelector('#poke-forms') as HTMLInputElement;
        const btnLoadMore = container.querySelector('#btn-load-more') as HTMLButtonElement;
        const modal = container.querySelector('#poke-modal') as HTMLElement;
        const modalClose = container.querySelector('#modal-close') as HTMLElement;
        const modalContent = container.querySelector('#modal-content') as HTMLElement;
        
        const filterPanel = container.querySelector('#advanced-filter-panel') as HTMLElement;
        const btnToggleFilter = container.querySelector('#btn-toggle-filter') as HTMLButtonElement;
        const btnResetFilter = container.querySelector('#btn-reset-filter') as HTMLButtonElement;
        const type1Select = container.querySelector('#filter-type1') as HTMLSelectElement;
        const type2Select = container.querySelector('#filter-type2') as HTMLSelectElement;
        const abilitySelect = container.querySelector('#filter-ability') as HTMLSelectElement;
        const moveContainer = container.querySelector('#filter-move-container') as HTMLElement;

        // 기술 자동완성 생성
        const moveAutocomplete = createAutocomplete<MoveData>({
            container: moveContainer,
            label: '배우는 기술 필터',
            placeholder: '기술 이름 입력',
            data: movesData,
            getSearchKey: (m) => m.searchKey,
            getDisplayName: (m) => m.nameKo,
            getDisplaySub: (m) => TYPE_NAMES_KO[m.type],
            onSelect: (m) => {
                filterMove = m.id;
                updateList();
            }
        });

        const checkLoadMoreVisibility = () => {
            loadMoreContainer.style.display = pagedData.length < filteredData.length ? 'block' : 'none';
        };

        const createCardHTML = (p: PokemonData) => {
            const currentGen = globalStore.getState().generation;
            const genId = typeof currentGen === 'number' ? currentGen : 9;
            const types = getTypesForGen(p, genId);

            return `
                <div class="poke-card" data-poke-id="${p.id}" style="background: var(--card-bg, #fff); border-radius: 12px; padding: 12px; text-align: left; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 0.8em; color: #888; font-weight: bold;">#${String(p.speciesId).padStart(3, '0')}</div>
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.nameKo}" loading="lazy" style="width: 96px; height: 96px; image-rendering: pixelated; display: block; margin: 0 0 -8px -10px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNDgiIHk9IjUyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'" />
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: bold; font-size: 0.9rem; white-space: nowrap;">${p.nameKo}</span>
                        <div style="display: flex; gap: 2px;">
                            ${types.map((t: PokemonType) => `<span class="type-badge" style="background-color: ${TYPE_COLORS[t]}; color:#fff; font-size: 0.65rem; padding: 1px 4px; border-radius:3px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        };

        const openModal = (id: number) => {
            const p = fullData.find(x => x.id === id);
            if (!p) return;
            
            const currentGen = globalStore.getState().generation;
            const genId = typeof currentGen === 'number' ? currentGen : 9;
            
            const stats = getStatsForGen(p, genId);
            const types = getTypesForGen(p, genId);
            const abilities = getAbilitiesForGen(p, genId);
            const totalStat = Object.values(stats).reduce((a, b) => (a as number) + (b as number), 0) as number;

            modalContent.innerHTML = `
                <div style="text-align:center;">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" style="width: 120px; height: 120px; image-rendering:pixelated;" />
                    <h2 style="margin: 0;">${p.nameKo} <span style="font-size:0.6em; color:#888;">#${String(p.speciesId).padStart(3,'0')}</span></h2>
                    <p style="color:#666; font-size: 0.9em; margin-top: 5px;">${p.nameEn.toUpperCase()}</p>
                    <div style="margin: 10px 0;">
                        ${types.map((t: PokemonType) => `<span class="type-badge" style="background-color: ${TYPE_COLORS[t]}; color:#fff; font-size:0.85em; padding: 3px 8px; border-radius:4px; margin:0 2px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
                    </div>
                    
                    <div style="text-align:left; margin-top:15px; font-size:0.9rem;">
                        <strong>특성:</strong> ${abilities.length > 0 ? abilities.map((a: any) => {
                            const abData = abilitiesData.find(ad => ad.id === a.id);
                            return `<span title="${abData?.effect || ''}" style="${a.isHidden ? 'color:#888; font-style:italic;' : ''}">${abData?.nameKo || '알 수 없음'}${a.isHidden ? '(숨겨짐)' : ''}</span>`;
                        }).join(', ') : '없음'}
                    </div>

                    <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-top: 15px; text-align:left;">
                        <h4 style="margin-top:0; margin-bottom: 10px;">종족값 (${genId}세대 기준, 총합 ${totalStat})</h4>
                        ${Object.keys(stats).map(s => `
                            <div style="display: grid; grid-template-columns: 45px 30px 1fr; gap: 5px; font-size: 0.85em; align-items:center; margin-bottom:4px;">
                                <div style="font-weight:bold;">${s.toUpperCase()}</div><div>${(stats as any)[s]}</div>
                                <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:var(--primary-color); height:100%; width:${Math.min(100, ((stats as any)[s]/200)*100)}%;"></div></div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 15px;">
                        <a href="https://namu.wiki/w/${encodeURIComponent(p.nameKo)}" target="_blank" style="display:inline-block; padding:8px 15px; background:#00a495; color:#fff; text-decoration:none; border-radius:6px; font-size:0.85em; font-weight:bold;">나무위키 검색</a>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        };

        const updateList = () => {
            const currentGen = globalStore.getState().generation;
            const targetGen = typeof currentGen === 'number' ? currentGen : 9;

            filteredData = fullData.filter(p => {
                // 세대 필터링: 해당 세대까지 등장한 포켓몬만 표시
                if (p.genId > targetGen) return false;
                
                // 이름 검색
                if (searchTerm && !hangulIncludes(p.searchKey, searchTerm)) return false;
                
                // 폼 필터
                if (!showAllForms && !p.isDefault) return false;

                // 타입 필터
                const pTypes = getTypesForGen(p, targetGen);
                if (filterTypes[0] !== 'all' && !pTypes.includes(filterTypes[0] as any)) return false;
                if (filterTypes[1] !== 'all' && !pTypes.includes(filterTypes[1] as any)) return false;

                // 특성 필터
                if (filterAbility !== 'all') {
                    const pAbilities = getAbilitiesForGen(p, targetGen);
                    if (!pAbilities.some((a: any) => a.id === filterAbility)) return false;
                }

                // 기술 필터
                if (filterMove !== 'all') {
                    const learnset = p.learnsets[targetGen] || [];
                    if (!learnset.includes(filterMove)) return false;
                }

                // 종족값 필터
                const pStats = getStatsForGen(p, targetGen) as any;
                for (const statKey in filterStats) {
                    const val = pStats[statKey];
                    const [min, max] = (filterStats as any)[statKey];
                    if (val < min || val > max) return false;
                }

                return true;
            });

            currentPage = 1;
            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            gridEl.innerHTML = pagedData.map(createCardHTML).join('');
            (container.querySelector('#empty-msg') as HTMLElement).style.display = pagedData.length === 0 ? 'block' : 'none';
            checkLoadMoreVisibility();
        };

        const loadMore = () => {
            const nextItems = filteredData.slice(pagedData.length, pagedData.length + ITEMS_PER_PAGE);
            if (nextItems.length > 0) {
                pagedData.push(...nextItems);
                gridEl.insertAdjacentHTML('beforeend', nextItems.map(createCardHTML).join(''));
                checkLoadMoreVisibility();
            }
        };

        // 이벤트 리스너
        searchInput.addEventListener('input', (e) => { searchTerm = (e.target as HTMLInputElement).value; updateList(); });
        formCheck.addEventListener('change', (e) => { showAllForms = (e.target as HTMLInputElement).checked; updateList(); });
        btnLoadMore.addEventListener('click', loadMore);
        
        btnToggleFilter.addEventListener('click', () => {
            const isHidden = filterPanel.style.display === 'none';
            filterPanel.style.display = isHidden ? 'block' : 'none';
            btnToggleFilter.textContent = isHidden ? '필터 닫기 🔼' : '고급 필터 🔍';
        });

        type1Select.addEventListener('change', (e) => { filterTypes[0] = (e.target as HTMLSelectElement).value; updateList(); });
        type2Select.addEventListener('change', (e) => { filterTypes[1] = (e.target as HTMLSelectElement).value; updateList(); });
        abilitySelect.addEventListener('change', (e) => { 
            const val = (e.target as HTMLSelectElement).value;
            filterAbility = val === 'all' ? 'all' : parseInt(val);
            updateList();
        });

        container.querySelectorAll('.stat-min, .stat-max').forEach(input => {
            input.addEventListener('input', (e) => {
                const el = e.target as HTMLInputElement;
                const stat = el.getAttribute('data-stat') as keyof typeof filterStats;
                const val = el.value === '' ? (el.classList.contains('stat-min') ? 0 : 255) : parseInt(el.value);
                if (el.classList.contains('stat-min')) {
                    filterStats[stat][0] = val;
                } else {
                    filterStats[stat][1] = val;
                }
                updateList();
            });
        });

        btnResetFilter.addEventListener('click', () => {
            type1Select.value = 'all';
            type2Select.value = 'all';
            abilitySelect.value = 'all';
            moveAutocomplete.setValue('');
            filterTypes = ['all', 'all'];
            filterAbility = 'all';
            filterMove = 'all';
            filterStats = { hp: [0, 255], atk: [0, 255], def: [0, 255], spa: [0, 255], spd: [0, 255], spe: [0, 255] };
            container.querySelectorAll<HTMLInputElement>('.stat-min').forEach(i => i.value = '');
            container.querySelectorAll<HTMLInputElement>('.stat-max').forEach(i => i.value = '');
            updateList();
        });

        gridEl.addEventListener('click', (e) => {
            const card = (e.target as HTMLElement).closest('.poke-card');
            if (card) openModal(parseInt(card.getAttribute('data-poke-id') || '0'));
        });
        modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

        // 전역 설정 변경 구독
        const unsubscribe = globalStore.subscribe(() => {
            updateList();
        });

        updateList();
        return unsubscribe;

    } catch(err) {
        container.innerHTML = `<p style="color:red; padding: 20px;">도감 로드 실패: ${err}</p>`;
        return () => {};
    }
}
