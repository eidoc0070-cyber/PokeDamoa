import { fetchAbilitiesData } from '../../../data/pokeapi.js';
import type { AbilityData } from '../../../data/pokeapi.js';
import { hangulIncludes } from '../../../utils/hangul.js';

export async function renderAbilityList(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="padding:40px; text-align:center;">특성 데이터를 불러오는 중입니다...</div>`;

    try {
        const fullData = await fetchAbilitiesData();
        let filteredData = fullData;
        let pagedData: AbilityData[] = [];
        const ITEMS_PER_PAGE = 50;
        let searchTerm = '';

        container.innerHTML = `
            <div style="margin-bottom: 20px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px;">
                <input type="text" id="ability-search" placeholder="특성 이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
            </div>
            <div id="ability-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                <button id="btn-load-more" style="background: var(--primary-color, #1976d2); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">더 보기</button>
            </div>
        `;

        const listEl = container.querySelector('#ability-list')!;
        const searchInput = container.querySelector('#ability-search') as HTMLInputElement;
        const btnLoadMore = container.querySelector('#btn-load-more') as HTMLButtonElement;

        const createItemHTML = (a: AbilityData) => `
            <div style="background: var(--card-bg, #fff); border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 1.1rem; color: var(--primary-color);">${a.nameKo}</span>
                    <span style="font-size: 0.8rem; color: #888;">${a.nameEn.toUpperCase()}</span>
                </div>
                <div style="font-size: 0.85rem; color: #555; line-height: 1.5; background: rgba(0,0,0,0.02); padding: 10px; border-radius: 4px;">
                    ${a.effect || '상세 설명이 없습니다.'}
                </div>
            </div>
        `;

        const updateList = () => {
            filteredData = fullData.filter(a => !searchTerm || hangulIncludes(a.searchKey, searchTerm));
            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            listEl.innerHTML = pagedData.map(createItemHTML).join('');
            (container.querySelector('#load-more-container') as HTMLElement).style.display = pagedData.length < filteredData.length ? 'block' : 'none';
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
