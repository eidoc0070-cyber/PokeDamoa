import { fetchItemsData } from '../../../data/pokeapi.js';
import type { ItemData } from '../../../data/pokeapi.js';
import { hangulIncludes } from '../../../utils/hangul.js';

export async function renderItemList(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="padding:40px; text-align:center;">아이템 데이터를 불러오는 중입니다...</div>`;

    try {
        const fullData = await fetchItemsData();
        let filteredData = fullData;
        let pagedData: ItemData[] = [];
        const ITEMS_PER_PAGE = 60; // 2, 3, 4, 5, 6열 그리드 모두에 자연스럽게 대응 가능한 수치
        let searchTerm = '';

        container.innerHTML = `
            <div style="margin-bottom: 20px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px;">
                <input type="text" id="item-search" placeholder="아이템 이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
            </div>
            <div id="item-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;"></div>
            <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                <button id="btn-load-more" style="background: var(--primary-color, #1976d2); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">더 보기</button>
            </div>
        `;

        const listEl = container.querySelector('#item-list')!;
        const searchInput = container.querySelector('#item-search') as HTMLInputElement;
        const btnLoadMore = container.querySelector('#btn-load-more') as HTMLButtonElement;

        const createItemHTML = (i: ItemData) => `
            <div style="background: var(--card-bg, #fff); border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; gap: 12px; align-items: flex-start;">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${i.nameEn}.png" alt="${i.nameKo}" style="width: 32px; height: 32px; image-rendering: pixelated; background: rgba(0,0,0,0.03); border-radius: 4px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjZWVlIi8+PC9zdmc+'" />
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <span style="font-weight: bold; font-size: 1rem;">${i.nameKo}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #666; line-height: 1.4;">
                        ${i.effect || '설명이 없습니다.'}
                    </div>
                </div>
            </div>
        `;

        const updateList = () => {
            filteredData = fullData.filter(i => !searchTerm || hangulIncludes(i.searchKey, searchTerm));
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
