import { fetchPokedexData } from '../../data/pokeapi.js';
import type { PokemonData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { hangulIncludes } from '../../utils/hangul.js';

export async function renderPokedex(container: HTMLElement): Promise<() => void> {
    // 임시 로딩 UI
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 40px;">
            <div class="spinner" style="border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: var(--primary-color, #1976d2); animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 15px; color: var(--text-color, #333);">도감 데이터를 불러오는 중입니다...</p>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .pokedex-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 15px;
                margin-top: 20px;
            }
            .poke-card {
                background: var(--card-bg, #fff);
                border-radius: 12px;
                padding: 10px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                transition: transform 0.2s, box-shadow 0.2s;
                cursor: pointer;
            }
            .poke-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 12px rgba(0,0,0,0.1);
            }
            .poke-card img {
                width: 96px;
                height: 96px;
                image-rendering: pixelated;
                margin: 0 auto;
                display: block;
            }
            .type-badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.75em;
                color: #fff;
                margin: 0;
                text-shadow: 1px 1px 0 rgba(0,0,0,0.4);
                white-space: nowrap;
            }
        </style>
    `;

    try {
        const fullData = await fetchPokedexData();
        let filteredData = fullData;
        let pagedData: PokemonData[] = [];
        
        let currentPage = 1;
        const ITEMS_PER_PAGE = 40;

        const renderGrid = () => {
            const gridEl = container.querySelector('#pokedex-grid')!;
            const emptyMsg = container.querySelector('#empty-msg') as HTMLElement;
            
            gridEl.innerHTML = pagedData.map(createCardHTML).join('');
            if (pagedData.length === 0) {
                emptyMsg.style.display = 'block';
            } else {
                emptyMsg.style.display = 'none';
            }
            checkLoadMoreVisibility();
        };

        const appendGrid = (items: PokemonData[]) => {
            const gridEl = container.querySelector('#pokedex-grid')!;
            gridEl.insertAdjacentHTML('beforeend', items.map(createCardHTML).join(''));
        };

        const updateList = () => {
            filteredData = fullData.filter(p => {
                if (searchTerm && !hangulIncludes(p.searchKey, searchTerm)) return false;
                if (!showAllForms && !p.isDefault) return false;
                return true;
            });
            currentPage = 1;
            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            renderGrid();
        };

        const loadMore = () => {
            const nextIdx = currentPage * ITEMS_PER_PAGE;
            const moreItems = filteredData.slice(nextIdx, nextIdx + ITEMS_PER_PAGE);
            if (moreItems.length > 0) {
                pagedData.push(...moreItems);
                currentPage++;
                appendGrid(moreItems);
                checkLoadMoreVisibility();
            }
        };

        let searchTerm = '';
        let showAllForms = false;

        container.innerHTML = `
            <div>
                <h2 style="margin-top:0;">포켓몬 도감 (오프라인 속도 최적화)</h2>
                
                <div style="display:flex; justify-content: space-between; align-items:center; flex-wrap: wrap; gap: 10px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px;">
                    <div style="flex: 1; min-width: 200px;">
                        <input type="text" id="poke-search" placeholder="이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
                    </div>
                    <div>
                        <label style="cursor: pointer; font-size: 0.9em; user-select: none;">
                            <input type="checkbox" id="poke-forms" /> 다양한 폼(리전폼 등) 모두 보기
                        </label>
                    </div>
                </div>

                <div id="pokedex-grid" class="pokedex-grid"></div>
                
                <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                    <button id="btn-load-more" style="background: var(--button-bg, #007bff); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: 0.2s;">더 보기</button>
                </div>

                <p id="empty-msg" style="text-align:center; color:#888; display:none; padding: 40px;">검색 결과가 없습니다.</p>
            </div>
            
            <div id="poke-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;">
                <div style="background:var(--bg-color, #fff); color:var(--text-color, #333); width: 90%; max-width: 400px; border-radius: 12px; padding: 20px; position:relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
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

        const checkLoadMoreVisibility = () => {
            if (pagedData.length < filteredData.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        };

        const createCardHTML = (p: PokemonData) => {
            return `
                <div class="poke-card" data-poke-id="${p.id}" style="text-align: left; padding: 12px;">
                    <div style="font-size: 0.8em; color: #888; font-weight: bold;">#${String(p.speciesId).padStart(3, '0')}</div>
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.nameKo}" loading="lazy" style="width: 96px; height: 96px; image-rendering: pixelated; display: block; margin: 0 0 -8px -10px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNDgiIHk9IjUyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'" />
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: bold; font-size: 0.95rem; white-space: nowrap;">${p.nameKo}</span>
                        <div style="display: flex; gap: 2px;">
                            ${p.types.map(t => `<span class="type-badge" style="background-color: ${TYPE_COLORS[t]}; font-size: 0.7rem; padding: 1px 5px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        };

        const openModal = (id: number) => {
            const p = fullData.find(x => x.id === id);
            if (!p) return;

            const totalStat = p.stats.hp + p.stats.atk + p.stats.def + p.stats.spa + p.stats.spd + p.stats.spe;

            modalContent.innerHTML = `
                <div style="text-align:center;">
                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" style="width: 120px; height: 120px; image-rendering:pixelated;" />
                    <h2 style="margin: 0;">${p.nameKo} <span style="font-size:0.6em; color:#888;">#${typeof p.speciesId === 'number' ? String(p.speciesId).padStart(3,'0') : p.speciesId}</span></h2>
                    <p style="color:#666; font-size: 0.9em; margin-top: 5px;">${p.nameEn.toUpperCase()}</p>
                    
                    <div style="margin: 10px 0;">
                        ${p.types.map(t => `<span class="type-badge" style="background-color: ${TYPE_COLORS[t]}; font-size:0.9em; padding: 4px 10px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
                    </div>

                    <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-top: 15px; text-align:left;">
                        <h4 style="margin-top:0; margin-bottom: 10px;">종족값 (총합 ${totalStat})</h4>
                        <div style="display: grid; grid-template-columns: 40px 30px 1fr; gap: 5px; font-size: 0.85em; align-items:center;">
                            <div style="color:#e53935; font-weight:bold;">HP</div><div>${p.stats.hp}</div>
                            <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#e53935; height:100%; width:${Math.min(100, (p.stats.hp/255)*100)}%;"></div></div>

                            <div style="color:#f57c00; font-weight:bold;">공격</div><div>${p.stats.atk}</div>
                            <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#f57c00; height:100%; width:${Math.min(100, (p.stats.atk/255)*100)}%;"></div></div>

                            <div style="color:#fbc02d; font-weight:bold;">방어</div><div>${p.stats.def}</div>
                            <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#fbc02d; height:100%; width:${Math.min(100, (p.stats.def/255)*100)}%;"></div></div>

                            <div style="color:#1e88e5; font-weight:bold;">특공</div><div>${p.stats.spa}</div>
                            <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#1e88e5; height:100%; width:${Math.min(100, (p.stats.spa/255)*100)}%;"></div></div>

                            <div style="color:#4caf50; font-weight:bold;">특방</div><div>${p.stats.spd}</div>
                            <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#4caf50; height:100%; width:${Math.min(100, (p.stats.spd/255)*100)}%;"></div></div>

                            <div style="color:#e91e63; font-weight:bold;">스핏</div><div>${p.stats.spe}</div>
                            <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#e91e63; height:100%; width:${Math.min(100, (p.stats.spe/255)*100)}%;"></div></div>
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <a href="https://namu.wiki/w/${encodeURIComponent(p.nameKo)}" target="_blank" style="display:inline-block; padding:8px 15px; background:#00a495; color:#fff; text-decoration:none; border-radius:6px; font-size:0.9em; font-weight:bold;">나무위키 검색</a>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        };

        searchInput.addEventListener('input', (e) => {
            searchTerm = (e.target as HTMLInputElement).value;
            updateList();
        });

        formCheck.addEventListener('change', (e) => {
            showAllForms = (e.target as HTMLInputElement).checked;
            updateList();
        });

        btnLoadMore.addEventListener('click', loadMore);

        gridEl.addEventListener('click', (e) => {
            const card = (e.target as HTMLElement).closest('.poke-card') as HTMLElement;
            if (card) {
                const id = parseInt(card.getAttribute('data-poke-id') || '0');
                if (id) openModal(id);
            }
        });

        modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        updateList();

    } catch(err) {
        container.innerHTML = `<p style="color:red; padding: 20px;">도감 데이터를 로드하는데 실패했습니다.<br/>${err}</p>`;
    }

    return () => {};
}
