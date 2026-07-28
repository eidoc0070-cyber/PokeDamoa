import { FIELD_EFFECTS } from "../../../data/field-data.js";

export async function renderFieldList(container: HTMLElement): Promise<() => void> {
    const categories: Record<string, string> = {
        weather: "날씨",
        terrain: "필드",
        room: "룸",
        hazard: "엔트리 해저드",
        side: "기타 효과",
    };

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 25px;">
            ${Object.entries(categories)
                .map(([key, label]) => {
                    const effects = FIELD_EFFECTS.filter((e) => e.category === key);
                    if (effects.length === 0) return "";
                    return `
                    <section>
                        <h3 style="border-bottom: 2px solid var(--primary-color); padding-bottom: 5px; margin-bottom: 15px;">${label}</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                            ${effects
                                .map(
                                    (e) => `
                                <div style="background: var(--card-bg, #fff); border-radius: 12px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid var(--primary-color);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <span style="font-weight: bold; font-size: 1.1rem;">${e.nameKo}</span>
                                        <span style="font-size: 0.8rem; color: #888;">${e.nameEn}</span>
                                    </div>
                                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">${e.description}</p>
                                    <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: #444; line-height: 1.6;">
                                        ${e.details.map((d) => `<li>${d}</li>`).join("")}
                                    </ul>
                                </div>
                            `,
                                )
                                .join("")}
                        </div>
                    </section>
                `;
                })
                .join("")}
        </div>
    `;

    return () => {};
}
