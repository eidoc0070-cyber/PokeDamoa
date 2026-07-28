export function renderStatInputCard(options: {
    statKey: string;
    statName: string;
    statColor: string;
    base: number;
    iv: number;
    ev: number;
    naturePlus: boolean;
    natureMinus: boolean;
    realVal: number;
}): string {
    const { statKey, statName, statColor, base, iv, ev, naturePlus, natureMinus, realVal } = options;

    // 2열 그리드에 최적화된 콤팩트한 디자인
    return `
        <div class="stat-card" style="border-left: 4px solid ${statColor}; background: var(--surface-color, #fff); border-radius: 10px; padding: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px;">
                <span style="font-weight:bold; font-size:0.95rem; color:${statColor};">${statName}</span>
                <span style="font-size:1.3rem; font-weight:800; color:#d32f2f;">${realVal}</span>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.65rem; color:#888; margin-bottom:2px;">종족</label>
                    <input type="number" class="base-stat-input" data-stat="${statKey}" value="${base}" style="padding:6px 2px; border:1px solid #ddd; border-radius:6px; text-align:center; font-size:0.9rem; width:100%; box-sizing:border-box; background:#fdfdfd;" />
                </div>
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.65rem; color:#888; margin-bottom:2px;">개체</label>
                    <input type="number" class="iv-input" data-stat="${statKey}" value="${iv}" max="31" min="0" style="padding:6px 2px; border:1px solid #ddd; border-radius:6px; text-align:center; font-size:0.9rem; width:100%; box-sizing:border-box; background:#fdfdfd;" />
                </div>
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.65rem; color:#888; margin-bottom:2px;">노력</label>
                    <input type="number" class="ev-input" data-stat="${statKey}" value="${ev}" max="252" min="0" step="4" style="padding:6px 2px; border:1px solid #ddd; border-radius:6px; text-align:center; font-size:0.9rem; width:100%; box-sizing:border-box; background:#fdfdfd;" />
                </div>
            </div>
            
            ${
                statKey === "hp"
                    ? ""
                    : `
            <div style="display:flex; align-items:center; gap: 8px; font-size:0.8rem; background:rgba(0,0,0,0.02); padding:4px 6px; border-radius:6px; justify-content: space-around;">
                <label style="display:flex; align-items:center; gap:3px; cursor:pointer;">
                    <input type="radio" name="nature-plus" value="${statKey}" ${naturePlus ? "checked" : ""} style="width:14px; height:14px; accent-color: #d32f2f;" /> 
                    <span style="color:#d32f2f; font-weight:bold;">+</span>
                </label>
                <label style="display:flex; align-items:center; gap:3px; cursor:pointer;">
                    <input type="radio" name="nature-minus" value="${statKey}" ${natureMinus ? "checked" : ""} style="width:14px; height:14px; accent-color: #1976d2;" /> 
                    <span style="color:#1976d2; font-weight:bold;">-</span>
                </label>
            </div>
            `
            }
        </div>
    `;
}
