import { createAutocomplete } from "../../../components/SearchAutocomplete.js";
import { NATURES, type StatKey, TYPE_COLORS } from "../../../data/constants.js";
import { getMoveItemStyle, getSortedMovesForPoke, renderMoveItemExtra } from "../../../utils/pokemon-math.js";
import type { ParserContext } from "../parser.js";
import type { PokemonSlot } from "../types.js";

interface SlotEditorOptions {
    container: HTMLElement;
    slot: PokemonSlot;
    ctx: ParserContext;
    onUpdate: (updatedSlot: PokemonSlot) => void;
}

export function renderPokemonSlotEditor(options: SlotEditorOptions) {
    const { container, slot, ctx, onUpdate } = options;

    const REVERSE_STAT_MAP: Record<StatKey, string> = {
        hp: "체력",
        atk: "공격",
        def: "방어",
        spa: "특공",
        spd: "특방",
        spe: "스피드",
    };

    container.innerHTML = `
        <div class="slot-editor card" style="padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 12px; background: var(--surface-color);">
            <div class="slot-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; font-size:1.1rem;">포켓몬 #${ctx.pokemon.find((p) => p.id === slot.pokemonId)?.nameKo || "미선택"}</h3>
                <div style="display:flex; gap:10px;">
                    <label style="font-size:0.8rem; display:flex; align-items:center; gap:5px;">
                        Lv. <input type="number" class="level-input" value="${slot.level}" style="width:50px; padding:2px 5px;" min="1" max="100" />
                    </label>
                </div>
            </div>

            <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <div id="poke-search-box"></div>
                <div id="item-search-box"></div>
            </div>

            <div class="row" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:10px;">
                <div id="ability-search-box"></div>
                <div id="nature-select-box">
                    <label style="font-weight:bold; display:block; margin-bottom:5px; font-size:0.9em;">성격</label>
                    <select class="nature-select" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; background:#fff;">
                        ${NATURES.map((n) => `<option value="${n.id}" ${slot.natureId === n.id ? "selected" : ""}>${n.nameKo} (${n.nameEn})</option>`).join("")}
                    </select>
                </div>
            </div>

            <div class="moves-section" style="margin-top:20px;">
                <h4 style="margin:0 0 10px 0; font-size:0.9rem;">기술</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div id="move-0-box"></div>
                    <div id="move-1-box"></div>
                    <div id="move-2-box"></div>
                    <div id="move-3-box"></div>
                </div>
            </div>

            <div class="stats-section" style="margin-top:20px;">
                <h4 style="margin:0 0 10px 0; font-size:0.9rem;">노력치 (EVs)</h4>
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
                    ${(["hp", "atk", "def", "spa", "spd", "spe"] as StatKey[])
                        .map(
                            (s) => `
                        <div style="display:flex; flex-direction:column; gap:3px;">
                            <label style="font-size:0.75rem; color:#666;">${REVERSE_STAT_MAP[s]}</label>
                            <input type="number" class="ev-input" data-stat="${s}" value="${slot.evs[s]}" style="width:100%; padding:5px; border:1px solid #eee; border-radius:4px;" min="0" max="252" />
                        </div>
                    `,
                        )
                        .join("")}
                </div>
            </div>
        </div>
    `;

    // Events & Autocompletes
    const _pokeInput = createAutocomplete({
        container: container.querySelector("#poke-search-box")!,
        label: "포켓몬",
        placeholder: "이름 검색",
        data: ctx.pokemon,
        initialValue: ctx.pokemon.find((p) => p.id === slot.pokemonId)?.nameKo,
        getSearchKey: (p) => p.searchKey,
        getDisplayName: (p) => p.nameKo,
        getDisplaySub: (p) => `(${p.nameEn})`,
        onSelect: (p) => {
            slot.pokemonId = p.id;
            updateUI();
            onUpdate(slot);
        },
    });

    const _itemInput = createAutocomplete({
        container: container.querySelector("#item-search-box")!,
        label: "도구",
        placeholder: "도구 검색",
        data: ctx.items,
        initialValue: ctx.items.find((i) => i.id === slot.itemId)?.nameKo,
        getSearchKey: (i) => i.searchKey,
        getDisplayName: (i) => i.nameKo,
        getDisplaySub: (i) => `(${i.nameEn})`,
        onSelect: (i) => {
            slot.itemId = i.id;
            onUpdate(slot);
        },
    });

    const _abilityInput = createAutocomplete({
        container: container.querySelector("#ability-search-box")!,
        label: "특성",
        placeholder: "특성 검색",
        data: ctx.abilities,
        initialValue: ctx.abilities.find((a) => a.id === slot.abilityId)?.nameKo,
        getSearchKey: (a) => a.searchKey,
        getDisplayName: (a) => a.nameKo,
        getDisplaySub: (a) => `(${a.nameEn})`,
        onSelect: (a) => {
            slot.abilityId = a.id;
            onUpdate(slot);
        },
    });

    const moveInputs = [0, 1, 2, 3].map((i) => {
        return createAutocomplete({
            container: container.querySelector(`#move-${i}-box`)!,
            label: `기술 ${i + 1}`,
            placeholder: "기술 검색",
            data: getSortedMovesForPoke(
                ctx.moves,
                ctx.pokemon.find((p) => p.id === slot.pokemonId),
                9,
            ),
            initialValue: ctx.moves.find((m) => m.id === slot.moveIds[i])?.nameKo,
            getSearchKey: (m) => m.searchKey,
            getDisplayName: (m) => m.nameKo,
            getDisplaySub: (m) => `(위력 ${m.power || "-"})`,
            onSelect: (m) => {
                slot.moveIds[i] = m.id;
                onUpdate(slot);
            },
        });
    });

    container.querySelector(".nature-select")?.addEventListener("change", (e) => {
        slot.natureId = parseInt((e.target as HTMLSelectElement).value, 10);
        onUpdate(slot);
    });

    container.querySelector(".level-input")?.addEventListener("change", (e) => {
        slot.level = parseInt((e.target as HTMLInputElement).value, 10) || 100;
        onUpdate(slot);
    });

    container.querySelectorAll(".ev-input").forEach((el) => {
        el.addEventListener("change", (e) => {
            const stat = (e.target as HTMLElement).dataset.stat as StatKey;
            slot.evs[stat] = parseInt((e.target as HTMLInputElement).value, 10) || 0;
            onUpdate(slot);
        });
    });

    const updateUI = () => {
        const poke = ctx.pokemon.find((p) => p.id === slot.pokemonId);
        container.querySelector("h3")!.textContent = `포켓몬 #${poke?.nameKo || "미선택"}`;

        // 기술 목록 갱신
        const sortedMoves = getSortedMovesForPoke(ctx.moves, poke, 9);
        moveInputs.forEach((input) => {
            input.setData(sortedMoves);
            input.setOptions({
                getItemStyle: (m) => getMoveItemStyle(m, poke, 9),
                renderItemExtra: (m) => renderMoveItemExtra(m, poke, 9, TYPE_COLORS),
            });
        });
    };

    updateUI();
}
