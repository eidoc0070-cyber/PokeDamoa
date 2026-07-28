import type { Party } from "../types.js";

export function renderPartyList(
    container: HTMLElement,
    parties: Party[],
    onEdit: (p: Party) => void,
    onDelete: (id: string) => void,
    onCreate: () => void,
) {
    container.innerHTML = `
        <div class="party-list-container">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="margin:0;">내 파티 목록</h2>
                <button id="btn-create-party" class="btn btn-primary">➕ 새 파티</button>
            </div>
            
            <div id="parties-grid" style="display:grid; grid-template-columns: 1fr; gap:15px;">
                ${
                    parties.length === 0
                        ? `
                    <div class="card" style="text-align:center; padding:40px; color:#888;">
                        저장된 파티가 없습니다. <br/> 새 파티를 만들어보세요!
                    </div>
                `
                        : parties
                              .map(
                                  (p) => `
                    <div class="card party-card" data-id="${p.id}" style="padding:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0 0 5px 0; font-size:1.1rem;">${p.name}</h3>
                            <div style="display:flex; gap:5px; font-size:0.8rem; color:#666;">
                                ${p.members.filter((m) => m.pokemonId !== 0).length}마리 포켓몬
                                <span style="margin: 0 5px;">|</span>
                                ${new Date(p.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-icon btn-edit" data-id="${p.id}" title="수정">✏️</button>
                            <button class="btn btn-icon btn-delete" data-id="${p.id}" title="삭제">🗑️</button>
                        </div>
                    </div>
                `,
                              )
                              .join("")
                }
            </div>
        </div>
    `;

    container.querySelector("#btn-create-party")?.addEventListener("click", onCreate);

    container.querySelectorAll(".party-card").forEach((card) => {
        card.addEventListener("click", (e) => {
            if ((e.target as HTMLElement).closest(".btn-delete")) return;
            if ((e.target as HTMLElement).closest(".btn-edit")) return;
            const id = card.getAttribute("data-id");
            const party = parties.find((p) => p.id === id);
            if (party) onEdit(party);
        });
    });

    container.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            const party = parties.find((p) => p.id === id);
            if (party) onEdit(party);
        });
    });

    container.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id")!;
            if (confirm("정말로 이 파티를 삭제하시겠습니까?")) {
                onDelete(id);
            }
        });
    });
}
