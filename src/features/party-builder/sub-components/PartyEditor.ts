import { renderPokemonSlotEditor } from './PokemonSlotEditor.js';
import type { Party, PokemonSlot } from '../types.js';
import type { ParserContext } from '../parser.js';
import { renderImportExportModal } from './ImportExportModal.js';

export function renderPartyEditor(container: HTMLElement, party: Party, ctx: ParserContext, onSave: (p: Party) => void, onBack: () => void) {
    container.innerHTML = `
        <div class="party-editor-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button id="btn-back" class="btn">⬅️ 목록</button>
                <input type="text" id="party-name-input" value="${party.name}" style="flex:1; margin: 0 15px; padding: 10px; font-size:1.2rem; font-weight:bold; border:1px solid #ccc; border-radius:8px;" placeholder="파티 이름 입력" />
                <button id="btn-save-party" class="btn btn-primary">저장</button>
            </div>

            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button id="btn-import" class="btn" style="flex:1;">📥 가져오기 (Showdown)</button>
                <button id="btn-export" class="btn" style="flex:1;">📤 내보내기 (Showdown)</button>
            </div>

            <div id="slots-container" style="display:grid; grid-template-columns: 1fr; gap:20px;">
                <!-- 슬롯들이 렌더링될 자리 -->
            </div>
        </div>
    `;

    const slotsContainer = container.querySelector('#slots-container') as HTMLElement;
    const nameInput = container.querySelector('#party-name-input') as HTMLInputElement;

    const renderSlots = () => {
        slotsContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const slotWrapper = document.createElement('div');
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
                }
            });
            slotsContainer.appendChild(slotWrapper);
        }
    };

    renderSlots();

    container.querySelector('#btn-back')?.addEventListener('click', onBack);
    container.querySelector('#btn-save-party')?.addEventListener('click', () => {
        party.name = nameInput.value || '무제 파티';
        party.updatedAt = new Date().toISOString();
        onSave(party);
    });

    container.querySelector('#btn-import')?.addEventListener('click', () => {
        renderImportExportModal({
            container: document.body,
            mode: 'import',
            ctx,
            onImport: (slots) => {
                party.members = slots;
                renderSlots();
            }
        });
    });

    container.querySelector('#btn-export')?.addEventListener('click', () => {
        renderImportExportModal({
            container: document.body,
            mode: 'export',
            ctx,
            slots: party.members
        });
    });
}

function createEmptySlot(): PokemonSlot {
    return {
        pokemonId: 0,
        moveIds: [null, null, null, null],
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        natureId: 0,
        level: 100
    };
}
