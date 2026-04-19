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
    
    // 모바일 환경에 최적화된 큰 입력 필드와 직관적인 카드형 UI 반환
    return `
        <div class="stat-card" style="border-left: 5px solid ${statColor}; background: var(--surface-color, #fff); border-radius: 12px; padding: 15px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight:bold; font-size:1.15rem; color:${statColor};">${statName}</span>
                <span style="font-size:1.6rem; font-weight:800; color:#d32f2f;">${realVal}</span>
            </div>
            
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.75rem; color:#888; margin-bottom:6px; font-weight:500;">종족값</label>
                    <input type="number" class="base-stat-input" data-stat="${statKey}" value="${base}" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center; font-size:1rem; width:100%; box-sizing:border-box; background:#fdfdfd;" />
                </div>
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.75rem; color:#888; margin-bottom:6px; font-weight:500;">개체 (0~31)</label>
                    <input type="number" class="iv-input" data-stat="${statKey}" value="${iv}" max="31" min="0" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center; font-size:1rem; width:100%; box-sizing:border-box; background:#fdfdfd;" />
                </div>
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.75rem; color:#888; margin-bottom:6px; font-weight:500;">노력 (0~252)</label>
                    <input type="number" class="ev-input" data-stat="${statKey}" value="${ev}" max="252" min="0" step="4" style="padding:10px; border:1px solid #ddd; border-radius:8px; text-align:center; font-size:1rem; width:100%; box-sizing:border-box; background:#fdfdfd;" />
                </div>
            </div>
            
            ${statKey === 'hp' ? '' : `
            <div style="display:flex; align-items:center; gap: 15px; font-size:0.9rem; background:rgba(0,0,0,0.02); padding:8px 10px; border-radius:8px;">
                <span style="color:#666; font-size:0.85rem; font-weight:bold;">성격</span>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; flex:1; justify-content:center;">
                    <input type="radio" name="nature-plus" value="${statKey}" ${naturePlus ? 'checked' : ''} style="width:18px; height:18px; accent-color: #d32f2f;" /> 
                    <span style="color:#d32f2f; font-weight:bold;">+ (1.1배)</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; flex:1; justify-content:center;">
                    <input type="radio" name="nature-minus" value="${statKey}" ${natureMinus ? 'checked' : ''} style="width:18px; height:18px; accent-color: #1976d2;" /> 
                    <span style="color:#1976d2; font-weight:bold;">- (0.9배)</span>
                </label>
            </div>
            `}
        </div>
    `;
}
