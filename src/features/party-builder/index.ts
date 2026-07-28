import { fetchAbilitiesData, fetchItemsData, fetchMovesData, fetchPokedexData } from "../../data/pokeapi.js";
import { loadParties, saveParties } from "../../state/storage.js";
import type { ParserContext } from "./parser.js";
import { renderPartyEditor } from "./sub-components/PartyEditor.js";
import { renderPartyList } from "./sub-components/PartyList.js";
import type { Party, PokemonSlot } from "./types.js";

export async function renderPartyBuilder(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="text-align:center; padding: 40px;"><p>데이터를 불러오는 중...</p></div>`;

    try {
        const [pokemon, moves, items, abilities] = await Promise.all([
            fetchPokedexData(),
            fetchMovesData(),
            fetchItemsData(),
            fetchAbilitiesData(),
        ]);

        const ctx: ParserContext = { pokemon, moves, items, abilities };
        let parties: Party[] = loadParties();
        let currentView: "list" | "edit" = "list";
        let editingParty: Party | null = null;

        const render = () => {
            container.innerHTML = "";
            const content = document.createElement("div");
            container.appendChild(content);

            if (currentView === "list") {
                renderPartyList(
                    content,
                    parties,
                    (party) => {
                        editingParty = JSON.parse(JSON.stringify(party)); // Deep clone for editing
                        currentView = "edit";
                        render();
                    },
                    (id) => {
                        parties = parties.filter((p) => p.id !== id);
                        saveParties(parties);
                        render();
                    },
                    () => {
                        editingParty = createNewParty();
                        currentView = "edit";
                        render();
                    },
                );
            } else if (currentView === "edit" && editingParty) {
                renderPartyEditor(
                    content,
                    editingParty,
                    ctx,
                    (updatedParty) => {
                        const index = parties.findIndex((p) => p.id === updatedParty.id);
                        if (index !== -1) {
                            parties[index] = updatedParty;
                        } else {
                            parties.push(updatedParty);
                        }
                        saveParties(parties);
                        currentView = "list";
                        render();
                    },
                    () => {
                        currentView = "list";
                        render();
                    },
                );
            }
        };

        render();

        return () => {
            // Cleanup if needed
        };
    } catch (err) {
        container.innerHTML = `<div class="card"><p style="color:red; text-align:center;">오류: ${err}</p></div>`;
        return () => {};
    }
}

function createNewParty(): Party {
    const now = new Date().toISOString();
    return {
        id: Date.now().toString(),
        name: "새로운 파티",
        members: Array(6)
            .fill(null)
            .map(() => createEmptySlot()),
        createdAt: now,
        updatedAt: now,
    };
}

function createEmptySlot(): PokemonSlot {
    return {
        pokemonId: 0,
        moveIds: [null, null, null, null],
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        natureId: 0,
        level: 100,
    };
}
