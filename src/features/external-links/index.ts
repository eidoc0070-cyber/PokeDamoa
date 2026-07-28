interface LinkItem {
    id: string;
    name: string;
    url: string;
}

const DEFAULT_LINKS: LinkItem[] = [
    { id: "9", name: "스마트누오", url: "https://smartnuo.com" },
    { id: "5", name: "타입계산기", url: "https://pkmn.help" },
    { id: "12", name: "포케모음", url: "https://pokemoem.com" },
    { id: "1", name: "다용도계산기", url: "https://pokemon.co.kr" },
    { id: "10", name: "포켓몬 위키 (Fandom)", url: "https://pokemon.fandom.com/ko/wiki/" },
    { id: "8", name: "포켓몬 픽률 (일본어)", url: "https://sv.pokedb.tokyo" },
    { id: "4", name: "Smogon", url: "https://www.smogon.com" },
    { id: "7", name: "Pokémon Showdown", url: "https://pokemonshowdown.com" },
    { id: "11", name: "포켓몬 코리아 도감", url: "https://pokemonkorea.co.kr/pokedex" },
    { id: "6", name: "Pikalytics (사용률 통계)", url: "https://www.pikalytics.com" },
    { id: "13", name: "랭커덱 (GameWith)", url: "https://gamewith.jp/pokemon-sv/article/show/385638" },
    { id: "2", name: "PokéDB", url: "https://pokemondb.net" },
    { id: "3", name: "Serebii.net", url: "https://www.serebii.net" },
];

const STORAGE_KEY = "pokedamoa_external_links";

export async function renderExternalLinks(container: HTMLElement): Promise<() => void> {
    let links: LinkItem[] = [];
    let isEditMode = false;

    // 로컬 스토리지에서 불러오기
    const savedLinks = localStorage.getItem(STORAGE_KEY);
    if (savedLinks) {
        try {
            links = JSON.parse(savedLinks);
        } catch (_e) {
            links = [...DEFAULT_LINKS];
        }
    } else {
        links = [...DEFAULT_LINKS];
    }

    const saveLinks = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    };

    const renderUI = () => {
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">외부 링크</h2>
                    <button id="btn-toggle-edit" style="padding:8px 15px; background:${isEditMode ? "#4caf50" : "#2196f3"}; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
                        ${isEditMode ? "편집 완료" : "편집 모드"}
                    </button>
                </div>
                <p style="color:#666; font-size:0.9em; margin-bottom:10px;">
                    ${isEditMode ? "링크를 드래그하여 순서를 변경하거나, 내용을 수정하고 삭제할 수 있습니다." : "주요 포켓몬 관련 사이트 바로가기입니다."}
                </p>

                <div id="links-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;">
                    ${links
                        .map(
                            (link, index) => `
                        <div class="link-item-wrapper" data-id="${link.id}" data-index="${index}" style="display:flex; flex-direction:column; gap:5px; padding:10px; border:1px solid #eee; border-radius:8px; background:#fff; transition:all 0.2s; position:relative;">
                            ${
                                isEditMode
                                    ? `
                                <div class="link-header" style="display:flex; justify-content:space-between; align-items:center; margin:-10px -10px 8px -10px; padding:6px 10px; background:#f8f9fa; border-bottom:1px solid #eee; border-radius:8px 8px 0 0; cursor:grab;">
                                    <span style="font-size:1.1rem; color:#adb5bd; user-select:none;">☰</span>
                                    <button class="btn-delete-link" data-id="${link.id}" style="padding:2px 8px; background:#ffc107; color:#212529; border:none; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold;">삭제</button>
                                </div>
                                <input type="text" class="edit-name" data-id="${link.id}" value="${link.name}" placeholder="이름" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:4px; font-size:0.9rem;" />
                                <input type="text" class="edit-url" data-id="${link.id}" value="${link.url}" placeholder="URL" style="width:100%; padding:5px; border:1px solid #ccc; border-radius:4px; font-size:0.8rem;" />
                            `
                                    : `
                                <button class="btn-link-go" data-url="${link.url}" style="width:100%; padding:15px 10px; background:#f5f5f5; border:1px solid #ddd; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1rem; text-align:center; transition:background 0.2s;">
                                    ${link.name}
                                </button>
                            `
                            }
                        </div>
                    `,
                        )
                        .join("")}
                    
                    ${
                        isEditMode
                            ? `
                        <div style="display:flex; flex-direction:column; gap:10px; padding:10px; border:2px dashed #ccc; border-radius:8px; background:rgba(0,0,0,0.02); align-items:center; justify-content:center; min-height:100px;">
                            <input type="text" id="new-link-name" placeholder="새 링크 이름" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" />
                            <input type="text" id="new-link-url" placeholder="https://..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;" />
                            <button id="btn-add-link" style="width:100%; padding:8px; background:#4caf50; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">+ 추가</button>
                        </div>
                    `
                            : ""
                    }
                </div>

                ${
                    isEditMode
                        ? `
                    <div style="margin-top:20px; text-align:right;">
                        <button id="btn-reset-links" style="padding:8px 15px; background:#666; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.9rem;">기본 설정으로 초기화</button>
                    </div>
                `
                        : ""
                }
            </div>
        `;
        attachEvents();
    };

    const attachEvents = () => {
        // 편집 모드 토글
        const btnToggleEdit = container.querySelector("#btn-toggle-edit") as HTMLButtonElement;
        btnToggleEdit.addEventListener("click", () => {
            if (isEditMode) {
                saveLinks();
            }
            isEditMode = !isEditMode;
            renderUI();
        });

        if (isEditMode) {
            // 실시간 입력 반영
            container.querySelectorAll(".edit-name").forEach((input) => {
                input.addEventListener("input", (e) => {
                    const id = (e.target as HTMLInputElement).getAttribute("data-id");
                    const val = (e.target as HTMLInputElement).value;
                    const link = links.find((l) => l.id === id);
                    if (link) link.name = val;
                });
            });
            container.querySelectorAll(".edit-url").forEach((input) => {
                input.addEventListener("input", (e) => {
                    const id = (e.target as HTMLInputElement).getAttribute("data-id");
                    const val = (e.target as HTMLInputElement).value;
                    const link = links.find((l) => l.id === id);
                    if (link) link.url = val;
                });
            });

            // 드래그 앤 드롭 구현
            let draggedIndex: number | null = null;
            const wrappers = container.querySelectorAll(".link-item-wrapper");

            wrappers.forEach((wrapper) => {
                const header = wrapper.querySelector(".link-header") as HTMLElement;
                if (header) {
                    header.addEventListener("mousedown", (e) => {
                        // 삭제 버튼 클릭 시 드래그 방지
                        if ((e.target as HTMLElement).closest(".btn-delete-link")) return;
                        (wrapper as HTMLElement).setAttribute("draggable", "true");
                    });
                }

                const resetDraggable = () => {
                    (wrapper as HTMLElement).setAttribute("draggable", "false");
                };

                wrapper.addEventListener("dragstart", (e) => {
                    draggedIndex = parseInt((e.currentTarget as HTMLElement).getAttribute("data-index") || "0", 10);
                    (e.currentTarget as HTMLElement).style.opacity = "0.4";
                });

                wrapper.addEventListener("dragover", (e) => {
                    e.preventDefault();
                });

                wrapper.addEventListener("drop", (e) => {
                    e.preventDefault();
                    const targetIndex = parseInt(
                        (e.currentTarget as HTMLElement).getAttribute("data-index") || "0",
                        10,
                    );
                    if (draggedIndex !== null && draggedIndex !== targetIndex) {
                        const draggedLink = links[draggedIndex];
                        if (draggedLink) {
                            links.splice(draggedIndex, 1);
                            links.splice(targetIndex, 0, draggedLink);
                            renderUI();
                        }
                    }
                });

                wrapper.addEventListener("dragend", (e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                    draggedIndex = null;
                    resetDraggable();
                });

                wrapper.addEventListener("mouseup", resetDraggable);
                wrapper.addEventListener("mouseleave", resetDraggable);
            });

            // 추가 버튼
            const btnAddLink = container.querySelector("#btn-add-link") as HTMLButtonElement;
            btnAddLink.addEventListener("click", () => {
                const nameInput = container.querySelector("#new-link-name") as HTMLInputElement;
                const urlInput = container.querySelector("#new-link-url") as HTMLInputElement;
                if (nameInput.value && urlInput.value) {
                    links.push({
                        id: Date.now().toString(),
                        name: nameInput.value,
                        url: urlInput.value,
                    });
                    saveLinks();
                    renderUI();
                } else {
                    alert("이름과 URL을 모두 입력해주세요.");
                }
            });

            // 삭제 버튼
            container.querySelectorAll(".btn-delete-link").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const id = btn.getAttribute("data-id");
                    if (confirm("이 링크를 삭제하시겠습니까?")) {
                        links = links.filter((l) => l.id !== id);
                        saveLinks();
                        renderUI();
                    }
                });
            });

            // 초기화 버튼
            const btnReset = container.querySelector("#btn-reset-links") as HTMLButtonElement;
            btnReset.addEventListener("click", () => {
                if (confirm("모든 링크가 기본 설정으로 초기화됩니다. 계속하시겠습니까?")) {
                    links = [...DEFAULT_LINKS];
                    saveLinks();
                    renderUI();
                }
            });
        } else {
            // 바로가기 버튼
            container.querySelectorAll(".btn-link-go").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const url = btn.getAttribute("data-url");
                    if (url) {
                        window.open(url, "_blank");
                    }
                });

                // 호버 효과 (inline style transition)
                btn.addEventListener("mouseenter", () => {
                    (btn as HTMLElement).style.background = "#e0e0e0";
                });
                btn.addEventListener("mouseleave", () => {
                    (btn as HTMLElement).style.background = "#f5f5f5";
                });
            });
        }
    };

    renderUI();

    return () => {};
}
