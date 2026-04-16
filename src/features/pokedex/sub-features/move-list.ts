import { fetchMovesData } from '../../../data/pokeapi.js';
import type { MoveData } from '../../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../../data/constants.js';
import { hangulIncludes } from '../../../utils/hangul.js';

export async function renderMoveList(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="padding:40px; text-align:center;">기술 데이터를 불러오는 중입니다...</div>`;

    try {
        const fullData = await fetchMovesData();
        let filteredData = fullData;
        let pagedData: MoveData[] = [];
        const ITEMS_PER_PAGE = 50;
        let searchTerm = '';

        container.innerHTML = `
            <div style="margin-bottom: 20px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px;">
                <input type="text" id="move-search" placeholder="기술 이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
            </div>
            <div id="move-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                <button id="btn-load-more" style="background: var(--primary-color, #1976d2); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">더 보기</button>
            </div>
        `;

        const listEl = container.querySelector('#move-list')!;
        const searchInput = container.querySelector('#move-search') as HTMLInputElement;
        const btnLoadMore = container.querySelector('#btn-load-more') as HTMLButtonElement;

        const createItemHTML = (m: MoveData) => `
            <div style="background: var(--card-bg, #fff); border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 5px solid ${TYPE_COLORS[m.type] || '#ccc'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 1.1rem;">${m.nameKo}</span>
                    <span style="font-size: 0.8rem; color: #888;">${m.nameEn.toUpperCase()}</span>
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                    <span style="background: ${TYPE_COLORS[m.type]}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${TYPE_NAMES_KO[m.type] || m.type}</span>
                    <span style="background: #eee; color: #666; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${m.category === 'physical' ? '물리' : m.category === 'special' ? '특수' : '변화'}</span>
                    <span style="font-weight: bold; font-size: 0.9rem;">위력: ${m.power || '-'}</span>
                </div>
                <div style="font-size: 0.85rem; color: #555; line-height: 1.4; background: rgba(0,0,0,0.02); padding: 8px; border-radius: 4px;">
                    ${m.effect || '상세 설명이 없습니다.'}
                </div>
            </div>
        `;

        const updateList = () => {
            filteredData = fullData.filter(m => !searchTerm || hangulIncludes(m.searchKey, searchTerm));
            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            listEl.innerHTML = pagedData.map(createItemHTML).join('');
            (container.querySelector('#load-more-container') as HTMLElement).style.display = pagedData.length < filteredData.length ? 'block' : 'none';
        };

        searchInput.addEventListener('input', (e) => { searchTerm = (e.target as HTMLInputElement).value; updateList(); });
        btnLoadMore.addEventListener('click', () => {
            const next = filteredData.slice(pagedData.length, pagedData.length + ITEMS_PER_PAGE);
            pagedData.push(...next);
            listEl.insertAdjacentHTML('beforeend', next.map(createItemHTML).join(''));
            (container.querySelector('#load-more-container') as HTMLElement).style.display = pagedData.length < filteredData.length ? 'block' : 'none';
        });

        updateList();
    } catch(err) { container.innerHTML = `<p>로드 실패: ${err}</p>`; }
    return () => {};
}
