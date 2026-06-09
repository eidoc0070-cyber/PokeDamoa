import { TYPE_COLORS, TYPE_NAMES_KO } from '../data/constants.js';
import type { PokemonType } from '../data/constants.js';
import type { PokemonData, AbilityData } from '../data/pokeapi.js';
import { globalStore } from '../state/store.js';
import { getStatsForGen, getTypesForGen, getAbilitiesForGen } from '../utils/pokemon-math.js';

export function renderPokemonModalContent(
    p: PokemonData, 
    abilitiesData: AbilityData[]
): string {
    const currentGen = globalStore.getState().generation;
    const genId = typeof currentGen === 'number' ? currentGen : 9;
    
    const stats = getStatsForGen(p, genId);
    const types = getTypesForGen(p, genId);
    const abilities = getAbilitiesForGen(p, genId);
    const totalStat = Object.values(stats).reduce((a, b) => (a as number) + (b as number), 0) as number;

    return `
        <div style="text-align:center;">
            <img src="/sprites/pokemon/${p.id}.webp" style="width: 120px; height: 120px; image-rendering:pixelated;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNDgiIHk9IjUyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';" />
            <h2 style="margin: 0;">${p.nameKo} <span style="font-size:0.6em; color:#888;">#${String(p.dexNumber).padStart(3,'0')}</span></h2>
            <p style="color:#666; font-size: 0.9em; margin-top: 5px;">${p.nameEn.toUpperCase()}</p>
            <div style="margin: 10px 0;">
                ${types.map((t: PokemonType) => `<span class="type-badge" style="background-color: ${TYPE_COLORS[t]}; color:#fff; font-size:0.85em; padding: 3px 8px; border-radius:4px; margin:0 2px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
            </div>
            
            <div style="text-align:left; margin-top:15px; font-size:0.9rem;">
                <strong>특성:</strong> ${abilities.length > 0 ? abilities.map((a: any) => {
                    const abData = abilitiesData.find(ad => ad.id === a.id);
                    return `<span title="${abData?.effect || ''}" style="${a.isHidden ? 'color:#888; font-style:italic;' : ''}">${abData?.nameKo || '알 수 없음'}${a.isHidden ? '(숨겨짐)' : ''}</span>`;
                }).join(', ') : '없음'}
            </div>

            <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin-top: 15px; text-align:left;">
                <h4 style="margin-top:0; margin-bottom: 10px;">종족값 (${genId}세대 기준, 총합 ${totalStat})</h4>
                ${Object.keys(stats).map(s => `
                    <div style="display: grid; grid-template-columns: 45px 30px 1fr; gap: 5px; font-size: 0.85em; align-items:center; margin-bottom:4px;">
                        <div style="font-weight:bold;">${s.toUpperCase()}</div><div>${(stats as any)[s]}</div>
                        <div style="background:#ddd; height:8px; border-radius:4px; overflow:hidden;"><div style="background:var(--primary-color); height:100%; width:${Math.min(100, ((stats as any)[s]/200)*100)}%;"></div></div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 15px;">
                <a href="https://namu.wiki/w/${encodeURIComponent(p.nameKo)}" target="_blank" style="display:inline-block; padding:8px 15px; background:#00a495; color:#fff; text-decoration:none; border-radius:6px; font-size:0.85em; font-weight:bold;">나무위키 검색</a>
            </div>
        </div>
    `;
}
