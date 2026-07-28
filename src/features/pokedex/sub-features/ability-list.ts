import type { AbilityData } from "../../../data/pokeapi.js";
import { fetchAbilitiesData } from "../../../data/pokeapi.js";
import { hangulIncludes } from "../../../utils/hangul.js";

export async function renderAbilityList(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="padding:40px; text-align:center;">특성 데이터를 불러오는 중입니다...</div>`;

    try {
        const fullData = await fetchAbilitiesData();
        let filteredData = fullData;
        let pagedData: AbilityData[] = [];
        const ITEMS_PER_PAGE = 50;
        let searchTerm = "";

        container.innerHTML = `
            <div style="margin-bottom: 20px; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px;">
                <input type="text" id="ability-search" placeholder="특성 이름 검색 (한글/영문)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box;" />
            </div>
            <div id="ability-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            <div id="load-more-container" style="text-align: center; margin-top: 20px; display: none;">
                <button id="btn-load-more" style="background: var(--primary-color, #1976d2); color: #fff; border:none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">더 보기</button>
            </div>
        `;

        const listEl = container.querySelector("#ability-list")!;
        const searchInput = container.querySelector("#ability-search") as HTMLInputElement;
        const btnLoadMore = container.querySelector("#btn-load-more") as HTMLButtonElement;

        const createItemHTML = (a: AbilityData) => `
            <div class="ability-item" style="background: var(--card-bg, #fff); border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 1.1rem; color: var(--primary-color);">${a.nameKo}</span>
                    <span style="font-size: 0.8rem; color: #888;">${a.nameEn.toUpperCase()}</span>
                </div>
                <div style="font-size: 0.85rem; color: #333; line-height: 1.5; background: rgba(var(--primary-rgb), 0.05); padding: 10px; border-radius: 6px;">
                    ${a.flavorText || a.effect || "상세 설명이 없습니다."}
                </div>
                ${
                    a.effect && a.flavorText
                        ? `
                    <details style="font-size: 0.75rem; color: #777; cursor: pointer; margin-top: 5px;">
                        <summary>상세 효과 (Technical)</summary>
                        <div style="padding: 5px; border-top: 1px dashed #ddd; margin-top: 5px;">${a.effect}</div>
                    </details>
                `
                        : ""
                }
            </div>
        `;

        const updateList = () => {
            filteredData = fullData.filter((a) => !searchTerm || hangulIncludes(a.searchKey, searchTerm));
            pagedData = filteredData.slice(0, ITEMS_PER_PAGE);
            listEl.innerHTML = pagedData.map(createItemHTML).join("");
            (container.querySelector("#load-more-container") as HTMLElement).style.display =
                pagedData.length < filteredData.length ? "block" : "none";
        };

        searchInput.addEventListener("input", (e) => {
            searchTerm = (e.target as HTMLInputElement).value;
            updateList();
        });
        btnLoadMore.addEventListener("click", () => {
            const next = filteredData.slice(pagedData.length, pagedData.length + ITEMS_PER_PAGE);
            pagedData.push(...next);
            listEl.insertAdjacentHTML("beforeend", next.map(createItemHTML).join(""));
            (container.querySelector("#load-more-container") as HTMLElement).style.display =
                pagedData.length < filteredData.length ? "block" : "none";
        });

        updateList();
    } catch (err) {
        container.innerHTML = `<p>로드 실패: ${err}</p>`;
    }
    return () => {};
}
