import { loadParties } from '../../../state/storage.js';
import type { Party, PokemonSlot } from '../types.js';
import { fetchPokedexData } from '../../../data/pokeapi.js';

export async function openPartySelectorModal(onSelect: (slot: PokemonSlot, party: Party) => void) {
    const parties: Party[] = loadParties();
    const pokedex = await fetchPokedexData();

    const modalOverlay = document.createElement('div');
    Object.assign(modalOverlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.7)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(3px)'
    });

    const modalContent = document.createElement('div');
    Object.assign(modalContent.style, {
        background: 'var(--surface-color)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        borderRadius: '16px',
        padding: '20px',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column'
    });

    modalContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; color:var(--text-color);">파티에서 불러오기</h3>
            <button id="modal-close-btn" style="border:none; background:rgba(0,0,0,0.05); width:30px; height:30px; border-radius:50%; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
        </div>
        <div id="party-list-scroll" style="overflow-y:auto; flex:1; padding-right:5px;">
            ${parties.length === 0 ? `
                <div style="text-align:center; padding:40px; color:#888;">
                    저장된 파티가 없습니다.
                </div>
            ` : parties.map(p => `
                <div class="party-item" data-id="${p.id}" style="border:1px solid var(--border-color); border-radius:12px; margin-bottom:12px; overflow:hidden;">
                    <div class="party-header" style="padding:10px 15px; background:rgba(0,0,0,0.02); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                        <strong style="font-size:1rem;">${p.name}</strong>
                        <span style="font-size:0.8rem; color:#888;">${p.members.filter(m => m.pokemonId !== 0).length}마리</span>
                    </div>
                    <div class="party-members" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; padding:10px;">
                        ${p.members.map((m, idx) => {
                            const poke = pokedex.find(pd => pd.id === m.pokemonId);
                            if (!poke) return `<div style="height:60px; background:#f9f9f9; border-radius:8px; border:1px dashed #ddd; display:flex; align-items:center; justify-content:center; color:#ccc; font-size:0.7rem;">비어있음</div>`;
                            return `
                                <div class="member-slot" data-party-id="${p.id}" data-slot-idx="${idx}" style="cursor:pointer; background:#fff; border:1px solid #eee; border-radius:8px; padding:5px; text-align:center; transition:transform 0.1s;">
                                   <img src="/sprites/pokemon/${poke.id}.webp" style="width:40px; height:40px; image-rendering:pixelated;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZWVlIi8+PC9zdmc+';" />
                                   <div style="font-size:0.7rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${poke.nameKo}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    const close = () => {
        document.body.removeChild(modalOverlay);
    };

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) close();
    });

    modalContent.querySelector('#modal-close-btn')?.addEventListener('click', close);

    modalContent.querySelectorAll('.party-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // member-slot 클릭은 별도로 처리하므로 여기서는 무시 (버블링 방지 처리를 아래에서 함)
            if ((e.target as HTMLElement).closest('.member-slot')) return;

            const partyId = item.getAttribute('data-id');
            const party = parties.find(p => p.id === partyId);
            if (party) {
                const firstSlot = party.members.find(m => m.pokemonId !== 0) || party.members[0];
                if (firstSlot) {
                    onSelect(firstSlot, party);
                    close();
                }
            }
        });
    });

    modalContent.querySelectorAll('.member-slot').forEach(slot => {
        slot.addEventListener('click', (e) => {
            e.stopPropagation(); // party-item 클릭 이벤트로 전파 방지
            const partyId = slot.getAttribute('data-party-id');
            const slotIdx = parseInt(slot.getAttribute('data-slot-idx')!);
            const party = parties.find(p => p.id === partyId);
            if (party && party.members[slotIdx]) {
                onSelect(party.members[slotIdx], party);
                close();
            }
        });

        slot.addEventListener('mouseenter', () => (slot as HTMLElement).style.transform = 'scale(1.05)');
        slot.addEventListener('mouseleave', () => (slot as HTMLElement).style.transform = 'scale(1)');
    });
}
