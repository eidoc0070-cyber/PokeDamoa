import { fetchMovesData } from '../../../data/pokeapi.js';
import type { MoveData } from '../../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO, POKEMON_TYPES } from '../../../data/constants.js';
import { hangulIncludes } from '../../../utils/hangul.js';
import { globalStore } from '../../../state/store.js';

export async function renderMoveList(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="padding:40px; text-align:center;">기술 데이터를 불러오는 중입니다...</div>`;

    try {
        const fullData = await fetchMovesData();
        let filteredData: MoveData[] = [];
        let pagedData: MoveData[] = [];
        const ITEMS_PER_PAGE = 50;
        
        // 필터 상태
        let searchTerm = '';
        let filterType: string | 'all' = 'all';
        let filterCategory: string | 'all' = 'all';
        let filterPower = [0, 255];
        let filterAccuracy = [0, 100];

        container.innerHTML = `
            <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display:flex; justify-content: space-between; align-items:center; flex-wrap: wrap; gap: 10px; margin-bottom:10px;">
                    <div style="flex: 1; min-width: 200px;">
                        <input type="text" id="move-search" placeholder="기술 이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
                    </div>
                    <button id="btn-toggle-move-filter" style="padding: 8px 15px; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight:bold;">
                        고급 필터 🔍
                    </button>
                </div>

                <div id="move-filter-panel" style="display:none; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 10px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                        <div>
                            <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">타입</label>
                            <select id="filter-move-type" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;">
                                <option value="all">전체 타입</option>
                                ${POKEMON_TYPES.map(t => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">분류</label>
                            <select id="filter-move-category" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;">
                                <option value="all">전체 분류</option>
                                <option value="physical">물리</option>
                                <option value="special">특수</option>
                                <option value="status">변화</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">위력 범위</label>
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="number" id="filter-power-min" placeholder="0" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;" />
                                <span>~</span>
                                <input type="number" id="filter-power-max" placeholder="255" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;" />
                            </div>
                        </div>
                        <div>
                            <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">명중률 범위</label>
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="number" id="filter-acc-min" placeholder="0" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;" />
                                <span>~</span>
                                <input type="number" id="filter-acc-max" placeholder="100" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="move-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            
            <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                <button id="btn-load-more" style="background: var(--primary-color, #1976d2); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">더 보기</button>
            </div>

            <p id="move-empty-msg" style="text-align:center; color:#888; display:none; padding: 40px;">검색 결과가 없습니다.</p>
        `;

        const listEl = container.querySelector('#move-list')!;
        const searchInput = container.querySelector('#move-search') as HTMLInputElement;
        const btnLoadMore = container.querySelector('#btn-load-more') as HTMLButtonElement;
        const emptyMsg = container.querySelector('#move-empty-msg') as HTMLElement;
        
        const filterPanel = container.querySelector('#move-filter-panel') as HTMLElement;
        const btnToggleFilter = container.querySelector('#btn-toggle-move-filter') as HTMLButtonElement;
        const typeSelect = container.querySelector('#filter-move-type') as HTMLSelectElement;
        const catSelect = container.querySelector('#filter-move-category') as HTMLSelectElement;
        const powerMin = container.querySelector('#filter-power-min') as HTMLInputElement;
        const powerMax = container.querySelector('#filter-power-max') as HTMLInputElement;
        const accMin = container.querySelector('#filter-acc-min') as HTMLInputElement;
        const accMax = container.querySelector('#filter-acc-max') as HTMLInputElement;

        const createItemHTML = (m: MoveData) => `
            <div class="move-item" style="background: var(--card-bg, #fff); border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 5px solid ${TYPE_COLORS[m.type] || '#ccc'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 1.1rem;">${m.nameKo}</span>
                    <span style="font-size: 0.8rem; color: #888;">${m.nameEn.toUpperCase()}</span>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <span style="background: ${TYPE_COLORS[m.type]}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${TYPE_NAMES_KO[m.type] || m.type}</span>
                    <span style="background: #eee; color: #666; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${m.category === 'physical' ? '물리' : m.category === 'special' ? '특수' : '변화'}</span>
                    <span style="font-weight: bold; font-size: 0.9rem;">위력: ${m.power || '-'}</span>
                    <span style="font-weight: bold; font-size: 0.9rem; margin-left:5px;">명중: ${m.accuracy || '-'}</span>
                    <span style="font-weight: bold; font-size: 0.9rem; margin-left:5px;">PP: ${m.pp || '-'}</span>
                </div>
                <div style="font-size: 0.85rem; color: #555; line-height: 1.4; background: rgba(0,0,0,0.02); padding: 8px; border-radius: 4px;">
                    ${m.effect || '상세 설명이 없습니다.'}
                </div>
            </div>
        `;

        const updateList = () => {
            const currentGen = globalStore.getState().generation;
            const targetGen = typeof currentGen === 'number' ? currentGen : 9;

            filteredData = fullData.filter(m => {
                // 해당 세대 도입 기술인지 확인
                // PokeAPI에서 기술의 도입 세대 데이터가 MoveData.id 등으로 추측 가능하지만 
                // 여기서는 m.changelog나 m.id 기준으로 필터링 (간략화를 위해 생략하거나 데이터 구조에 따라 적용)
                // 현재 MoveData에는 genId가 명시되어 있지 않으나, id 범위로 대략 알 수 있음.
                // 임시로 m.id < 1000 정도로 가정 (데이터 빌드 시 추가 필요)
                
                if (searchTerm && !hangulIncludes(m.searchKey, searchTerm)) return false;
                if (filterType !== 'all' && m.type !== filterType) return false;
                if (filterCategory !== 'all' && m.category !== filterCategory) return false;
                
                const pwr = m.power || 0;
                if (pwr < filterPower[0] || pwr > filterPower[1]) return false;
                
                const acc = m.accuracy || 100;
                if (acc < filterAccuracy[0] || acc > filterAccuracy[1]) return false;

                return true;
            });

            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            listEl.innerHTML = pagedData.map(createItemHTML).join('');
            (container.querySelector('#load-more-container') as HTMLElement).style.display = pagedData.length < filteredData.length ? 'block' : 'none';
            emptyMsg.style.display = pagedData.length === 0 ? 'block' : 'none';
        };

        // 디바운스 유틸리티
        const debounce = (fn: Function, delay: number) => {
            let timeoutId: any;
            return (...args: any[]) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn(...args), delay);
            };
        };

        const debouncedUpdate = debounce(updateList, 150);
        searchInput.addEventListener('input', (e) => { 
            searchTerm = (e.target as HTMLInputElement).value; 
            debouncedUpdate(); 
        });
        
        btnToggleFilter.addEventListener('click', () => {
            const isHidden = filterPanel.style.display === 'none';
            filterPanel.style.display = isHidden ? 'block' : 'none';
            btnToggleFilter.textContent = isHidden ? '필터 닫기 🔼' : '고급 필터 🔍';
        });

        typeSelect.addEventListener('change', (e) => { filterType = (e.target as HTMLSelectElement).value; updateList(); });
        catSelect.addEventListener('change', (e) => { filterCategory = (e.target as HTMLSelectElement).value; updateList(); });
        
        powerMin.addEventListener('input', (e) => { filterPower[0] = parseInt((e.target as HTMLInputElement).value) || 0; updateList(); });
        powerMax.addEventListener('input', (e) => { filterPower[1] = parseInt((e.target as HTMLInputElement).value) || 255; updateList(); });
        accMin.addEventListener('input', (e) => { filterAccuracy[0] = parseInt((e.target as HTMLInputElement).value) || 0; updateList(); });
        accMax.addEventListener('input', (e) => { filterAccuracy[1] = parseInt((e.target as HTMLInputElement).value) || 100; updateList(); });

        btnLoadMore.addEventListener('click', () => {
            const next = filteredData.slice(pagedData.length, pagedData.length + ITEMS_PER_PAGE);
            pagedData.push(...next);
            listEl.insertAdjacentHTML('beforeend', next.map(createItemHTML).join(''));
            (container.querySelector('#load-more-container') as HTMLElement).style.display = pagedData.length < filteredData.length ? 'block' : 'none';
        });

        // 전역 설정 변경 구독
        const unsubscribe = globalStore.subscribe(() => {
            updateList();
        });

        updateList();
        return unsubscribe;

    } catch(err) { container.innerHTML = `<p>로드 실패: ${err}</p>`; return () => {}; }
}
