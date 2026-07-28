import type { ParserContext } from "../parser.js";
import { exportShowdown, parseShowdown } from "../parser.js";
import type { Party, PokemonSlot } from "../types.js";
import { renderImportExportModal } from "./ImportExportModal.js";
import { renderPokemonSlotEditor } from "./PokemonSlotEditor.js";

export function renderPartyEditor(
    container: HTMLElement,
    party: Party,
    ctx: ParserContext,
    onSave: (p: Party) => void,
    onBack: () => void,
) {
    let viewMode: "visual" | "text" = "visual";

    const render = () => {
        container.innerHTML = `
            <div class="party-editor-container" style="display:flex; flex-direction:column; gap:15px; height: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button id="btn-back" class="btn">⬅️ 목록</button>
                    <input type="text" id="party-name-input" value="${party.name}" style="flex:1; margin: 0 10px; padding: 10px; font-size:1.1rem; font-weight:bold; border:1px solid #ccc; border-radius:8px;" placeholder="파티 이름 입력" />
                    <button id="btn-save-party" class="btn btn-primary">저장</button>
                </div>

                <div style="display:flex; gap:10px;">
                    <button id="btn-mode-visual" class="btn ${viewMode === "visual" ? "btn-primary" : ""}" style="flex:1;">🧩 시각적 편집</button>
                    <button id="btn-mode-text" class="btn ${viewMode === "text" ? "btn-primary" : ""}" style="flex:1;">📝 텍스트 편집</button>
                </div>

                <div id="editor-content" style="flex:1; overflow-y: auto;">
                    ${
                        viewMode === "visual"
                            ? `
                        <div style="display:flex; gap:10px; margin-bottom:15px;">
                            <button id="btn-import" class="btn" style="flex:1;">📥 가져오기</button>
                            <button id="btn-export" class="btn" style="flex:1;">📤 내보내기</button>
                        </div>
                        <div id="slots-container" style="display:grid; grid-template-columns: 1fr; gap:20px;"></div>
                    `
                            : `
                        <div style="height:100%; display:flex; flex-direction:column; gap:10px;">
                            <p style="font-size:0.85rem; color:#666; margin:0;">Showdown 형식을 지원합니다. (수정 시 즉시 반영)</p>
                            <textarea id="text-editor" style="flex:1; width:100%; min-height:400px; padding:15px; font-family:monospace; font-size:0.9rem; border:1px solid #ddd; border-radius:12px; resize:none; background:var(--surface-color); line-height:1.5;">${exportAll(party, ctx)}</textarea>
                        </div>
                    `
                    }
                </div>
            </div>
        `;

        attachEvents();
        if (viewMode === "visual") {
            renderSlots();
        }
    };

    const attachEvents = () => {
        container.querySelector("#btn-back")?.addEventListener("click", onBack);

        const nameInput = container.querySelector("#party-name-input") as HTMLInputElement;
        container.querySelector("#btn-save-party")?.addEventListener("click", () => {
            party.name = nameInput.value || "무제 파티";
            party.updatedAt = new Date().toISOString();
            onSave(party);
        });

        container.querySelector("#btn-mode-visual")?.addEventListener("click", () => {
            if (viewMode === "text") {
                syncFromText();
                viewMode = "visual";
                render();
            }
        });

        container.querySelector("#btn-mode-text")?.addEventListener("click", () => {
            if (viewMode === "visual") {
                viewMode = "text";
                render();
            }
        });

        if (viewMode === "visual") {
            container.querySelector("#btn-import")?.addEventListener("click", () => {
                renderImportExportModal({
                    container: document.body,
                    mode: "import",
                    ctx,
                    onImport: (slots) => {
                        party.members = slots;
                        render();
                    },
                });
            });

            container.querySelector("#btn-export")?.addEventListener("click", () => {
                renderImportExportModal({
                    container: document.body,
                    mode: "export",
                    ctx,
                    slots: party.members,
                });
            });
        } else {
            const textarea = container.querySelector("#text-editor") as HTMLTextAreaElement;
            let timeout: any;
            textarea.addEventListener("input", () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    syncFromText(textarea.value);
                }, 1000); // 1초 지연 후 동기화
            });
        }
    };

    const renderSlots = () => {
        const slotsContainer = container.querySelector("#slots-container") as HTMLElement;
        if (!slotsContainer) return;

        for (let i = 0; i < 6; i++) {
            const slotWrapper = document.createElement("div");
            let slot = party.members[i];
            if (!slot) {
                slot = createEmptySlot();
                party.members[i] = slot;
            }
            renderPokemonSlotEditor({
                container: slotWrapper,
                slot: slot,
                ctx,
                onUpdate: (updatedSlot) => {
                    party.members[i] = updatedSlot;
                },
            });
            slotsContainer.appendChild(slotWrapper);
        }
    };

    const syncFromText = (text?: string) => {
        const content = text || (container.querySelector("#text-editor") as HTMLTextAreaElement)?.value;
        if (content !== undefined) {
            const parsed = parseShowdown(content, ctx);
            // 최대 6마리까지만 채움
            const newMembers = Array(6)
                .fill(null)
                .map((_, i) => parsed[i] || createEmptySlot());
            party.members = newMembers;
        }
    };

    render();
}

function exportAll(party: Party, ctx: ParserContext): string {
    return party.members
        .filter((s) => s && s.pokemonId !== 0)
        .map((s) => exportShowdown(s, ctx, "ko"))
        .join("\n\n");
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
