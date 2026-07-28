import { POKEMON_TYPES, TYPE_NAMES_KO } from "../data/constants.js";
import type { AbilityData, MoveData } from "../data/pokeapi.js";
import { createAutocomplete } from "./SearchAutocomplete.js";

export interface FilterState {
    searchTerm: string;
    showAllForms: boolean;
    filterTypes: (string | "all")[];
    filterAbility: number | "all";
    filterMove: number | "all";
    filterStats: {
        hp: number[];
        atk: number[];
        def: number[];
        spa: number[];
        spd: number[];
        spe: number[];
    };
}

export function createFilterPanelHTML(abilitiesData: AbilityData[]): string {
    return `
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
                                ${POKEMON_TYPES.map((t) => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join("")}
                            </select>
                            <select id="filter-type2" style="flex:1; padding:5px; border-radius:4px; border:1px solid #ccc;">
                                <option value="all">타입 2 (전체)</option>
                                ${POKEMON_TYPES.map((t) => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join("")}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:5px;">특성 필터</label>
                        <select id="filter-ability" style="width:100%; padding:5px; border-radius:4px; border:1px solid #ccc;">
                            <option value="all">특성 선택 (전체)</option>
                            ${abilitiesData
                                .sort((a, b) => a.nameKo.localeCompare(b.nameKo))
                                .map((a) => `<option value="${a.id}">${a.nameKo}</option>`)
                                .join("")}
                        </select>
                    </div>
                    <div id="filter-move-container">
                        <!-- 기술 자동완성이 들어갈 곳 -->
                    </div>
                </div>

                <div style="margin-top:15px;">
                    <label style="display:block; font-weight:bold; font-size:0.85rem; margin-bottom:10px;">종족값 범위 필터</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                        ${["hp", "atk", "def", "spa", "spd", "spe"]
                            .map(
                                (s) => `
                            <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem;">
                                <span style="width:30px; font-weight:bold;">${s.toUpperCase()}</span>
                                <input type="number" class="stat-min" data-stat="${s}" placeholder="Min" style="width:45px; padding:3px; border:1px solid #ccc; border-radius:4px;" />
                                ~
                                <input type="number" class="stat-max" data-stat="${s}" placeholder="Max" style="width:45px; padding:3px; border:1px solid #ccc; border-radius:4px;" />
                            </div>
                        `,
                            )
                            .join("")}
                    </div>
                </div>
                
                <div style="margin-top:15px; text-align:right;">
                    <button id="btn-reset-filter" style="padding: 5px 12px; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">필터 초기화</button>
                </div>
            </div>
        </div>
    `;
}

export function initFilterPanel(container: HTMLElement, movesData: MoveData[], onUpdate: (state: FilterState) => void) {
    const searchInput = container.querySelector("#poke-search") as HTMLInputElement;
    const formCheck = container.querySelector("#poke-forms") as HTMLInputElement;
    const filterPanel = container.querySelector("#advanced-filter-panel") as HTMLElement;
    const btnToggleFilter = container.querySelector("#btn-toggle-filter") as HTMLButtonElement;
    const btnResetFilter = container.querySelector("#btn-reset-filter") as HTMLButtonElement;
    const type1Select = container.querySelector("#filter-type1") as HTMLSelectElement;
    const type2Select = container.querySelector("#filter-type2") as HTMLSelectElement;
    const abilitySelect = container.querySelector("#filter-ability") as HTMLSelectElement;
    const moveContainer = container.querySelector("#filter-move-container") as HTMLElement;

    const state: FilterState = {
        searchTerm: "",
        showAllForms: false,
        filterTypes: ["all", "all"],
        filterAbility: "all",
        filterMove: "all",
        filterStats: {
            hp: [0, 255],
            atk: [0, 255],
            def: [0, 255],
            spa: [0, 255],
            spd: [0, 255],
            spe: [0, 255],
        },
    };

    const moveAutocomplete = createAutocomplete<MoveData>({
        container: moveContainer,
        label: "배우는 기술 필터",
        placeholder: "기술 이름 입력",
        data: movesData,
        getSearchKey: (m) => m.searchKey,
        getDisplayName: (m) => m.nameKo,
        getDisplaySub: (m) => TYPE_NAMES_KO[m.type],
        onSelect: (m) => {
            state.filterMove = m.id;
            onUpdate(state);
        },
    });

    searchInput.addEventListener("input", (e) => {
        state.searchTerm = (e.target as HTMLInputElement).value;
        onUpdate(state);
    });

    formCheck.addEventListener("change", (e) => {
        state.showAllForms = (e.target as HTMLInputElement).checked;
        onUpdate(state);
    });

    btnToggleFilter.addEventListener("click", () => {
        const isHidden = filterPanel.style.display === "none";
        filterPanel.style.display = isHidden ? "block" : "none";
        btnToggleFilter.textContent = isHidden ? "필터 닫기 🔼" : "고급 필터 🔍";
    });

    type1Select.addEventListener("change", (e) => {
        state.filterTypes[0] = (e.target as HTMLSelectElement).value;
        onUpdate(state);
    });

    type2Select.addEventListener("change", (e) => {
        state.filterTypes[1] = (e.target as HTMLSelectElement).value;
        onUpdate(state);
    });

    abilitySelect.addEventListener("change", (e) => {
        const val = (e.target as HTMLSelectElement).value;
        state.filterAbility = val === "all" ? "all" : parseInt(val, 10);
        onUpdate(state);
    });

    container.querySelectorAll(".stat-min, .stat-max").forEach((input) => {
        input.addEventListener("input", (e) => {
            const el = e.target as HTMLInputElement;
            const stat = el.getAttribute("data-stat") as keyof FilterState["filterStats"];
            const val = el.value === "" ? (el.classList.contains("stat-min") ? 0 : 255) : parseInt(el.value, 10);
            if (el.classList.contains("stat-min")) {
                state.filterStats[stat][0] = val;
            } else {
                state.filterStats[stat][1] = val;
            }
            onUpdate(state);
        });
    });

    btnResetFilter.addEventListener("click", () => {
        type1Select.value = "all";
        type2Select.value = "all";
        abilitySelect.value = "all";
        moveAutocomplete.setValue("");
        state.filterTypes = ["all", "all"];
        state.filterAbility = "all";
        state.filterMove = "all";
        state.filterStats = { hp: [0, 255], atk: [0, 255], def: [0, 255], spa: [0, 255], spd: [0, 255], spe: [0, 255] };
        for (const i of container.querySelectorAll<HTMLInputElement>(".stat-min")) i.value = "";
        for (const i of container.querySelectorAll<HTMLInputElement>(".stat-max")) i.value = "";
        onUpdate(state);
    });

    return {
        getState: () => state,
        reset: () => btnResetFilter.click(),
    };
}
