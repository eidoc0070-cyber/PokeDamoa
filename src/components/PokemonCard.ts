import { TYPE_COLORS, TYPE_NAMES_KO } from '../data/constants.js';
import type { PokemonType } from '../data/constants.js';
import type { PokemonData } from '../data/pokeapi.js';
import { globalStore } from '../state/store.js';
import { getTypesForGen } from '../utils/pokemon-math.js';

export function createPokemonCard(p: PokemonData): string {
    const currentGen = globalStore.getState().generation;
    const genId = typeof currentGen === 'number' ? currentGen : 9;
    const types = getTypesForGen(p, genId);

    return `
        <div class="poke-card" data-poke-id="${p.id}" style="background: var(--card-bg, #fff); border-radius: 12px; padding: 12px; text-align: left; box-shadow: 0 4px 6px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s;">
            <div style="font-size: 0.8em; color: #888; font-weight: bold;">#${String(p.dexNumber).padStart(3, '0')}</div>
            <div class="skeleton" style="width: 96px; height: 96px; border-radius: 8px; margin: 0 0 -8px -10px;">
                <img src="/sprites/pokemon/${p.id}.webp" 
                     alt="${p.nameKo}" 
                     loading="lazy" 
                     style="width: 96px; height: 96px; image-rendering: pixelated; display: block;" 
                     onload="this.parentElement.classList.remove('skeleton')"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNDgiIHk9IjUyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'; this.parentElement.classList.remove('skeleton')" />
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                <span style="font-weight: bold; font-size: 0.9rem; white-space: nowrap;">${p.nameKo}</span>
                <div style="display: flex; gap: 2px;">
                    ${types.map((t: PokemonType) => `<span class="type-badge" style="background-color: ${TYPE_COLORS[t]}; color:#fff; font-size: 0.65rem; padding: 1px 4px; border-radius:3px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
                </div>
            </div>
        </div>
    `;
}
