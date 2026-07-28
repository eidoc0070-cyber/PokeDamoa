import { updatePath } from "../../state/url-params.js";
import { renderAbilityList } from "./sub-features/ability-list.js";
import { renderFieldList } from "./sub-features/field-list.js";
import { renderItemList } from "./sub-features/item-list.js";
import { renderMoveList } from "./sub-features/move-list.js";
import { renderPokemonList } from "./sub-features/pokemon-list.js";

type SubTab = "pokemon" | "move" | "ability" | "item" | "field";

export async function renderPokedex(container: HTMLElement, initialSubTab?: string): Promise<() => void> {
    let currentCleanup: (() => void) | null = null;

    // 우선순위: URL 파라미터 > 세션스토리지 > 기본값('pokemon')
    let activeSubTab: SubTab =
        (initialSubTab as SubTab) || (sessionStorage.getItem("pokedex_active_subtab") as SubTab) || "pokemon";

    // 유효하지 않은 서브탭이면 기본값으로
    const validTabs: SubTab[] = ["pokemon", "move", "ability", "item", "field"];
    if (!validTabs.includes(activeSubTab)) activeSubTab = "pokemon";

    container.innerHTML = `
        <div class="pokedex-hub" style="display:flex; flex-direction:column; min-height: 100%;">
            <div class="top-tab-bar" style="margin: -16px -16px 16px -16px;">
                <button data-subtab="pokemon" class="top-tab-btn">포켓몬</button>
                <button data-subtab="move" class="top-tab-btn">기술</button>
                <button data-subtab="ability" class="top-tab-btn">특성</button>
                <button data-subtab="item" class="top-tab-btn">아이템</button>
                <button data-subtab="field" class="top-tab-btn">필드</button>
            </div>
            <div id="sub-tab-content" style="flex:1;"></div>
        </div>
    `;

    const contentEl = container.querySelector("#sub-tab-content") as HTMLElement;
    const buttons = container.querySelectorAll<HTMLButtonElement>(".top-tab-btn");

    const switchSubTab = async (tab: SubTab, updateUrl = true) => {
        if (currentCleanup) currentCleanup();
        activeSubTab = tab;
        sessionStorage.setItem("pokedex_active_subtab", tab);

        if (updateUrl) {
            updatePath("pokedex", tab);
        }

        // UI 업데이트
        buttons.forEach((btn) => {
            if (btn.dataset.subtab === tab) btn.classList.add("active");
            else btn.classList.remove("active");
        });

        contentEl.innerHTML = "";

        switch (tab) {
            case "pokemon":
                currentCleanup = await renderPokemonList(contentEl);
                break;
            case "move":
                currentCleanup = await renderMoveList(contentEl);
                break;
            case "ability":
                currentCleanup = await renderAbilityList(contentEl);
                break;
            case "item":
                currentCleanup = await renderItemList(contentEl);
                break;
            case "field":
                currentCleanup = await renderFieldList(contentEl);
                break;
        }
    };

    buttons.forEach((btn) => {
        btn.onclick = () => switchSubTab(btn.dataset.subtab as SubTab);
    });

    // 초기 탭 로드 (최초 로드 시에는 URL 업데이트 불필요)
    await switchSubTab(activeSubTab, false);

    return () => {
        if (currentCleanup) currentCleanup();
    };
}
