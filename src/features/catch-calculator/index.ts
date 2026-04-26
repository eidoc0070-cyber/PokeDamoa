import { fetchPokedexData } from '../../data/pokeapi.js';
import type { PokemonData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { calculateCatchChance } from '../../utils/pokemon-math.js';
import { createAutocomplete } from '../../components/SearchAutocomplete.js';
import { globalStore } from '../../state/store.js';

export async function renderCatchCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="text-align:center; padding: 40px;"><p>데이터를 불러오는 중...</p></div>`;

    try {
        const fullData = await fetchPokedexData();
        
        let selectedPoke: PokemonData | null = fullData.find(p => p.id === 25) || fullData[0];
        let currentHpPercent = 100;
        let statusBonus = 1.0;
        let ballBonus = 1.0;
        let captureRate = selectedPoke?.captureRate || 255;

        const renderStructure = () => {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <h2 style="margin:0;">포획 계산기</h2>
                    <div style="display:flex; flex-wrap:wrap; gap:20px;">
                        <div style="flex:1; min-width:300px;">
                            <div id="poke-autocomplete-container"></div>
                            <div style="margin-top:15px;">
                                <label id="capture-rate-label" style="display:block; font-weight:bold; margin-bottom:5px;">기본 포획률: ${captureRate}</label>
                                <input type="range" id="hp-range" min="1" max="100" value="${currentHpPercent}" style="width:100%;" />
                                <p>남은 HP: <strong id="hp-display">${currentHpPercent}%</strong></p>
                            </div>
                        </div>
                        <div style="flex:1; min-width:300px; background:#f9f9f9; padding:15px; border-radius:12px;">
                            <label style="display:block; font-weight:bold; margin-bottom:10px;">상태 이상</label>
                            <select id="status-select" style="width:100%; padding:8px; border-radius:8px;">
                                <option value="1.0" ${statusBonus === 1.0 ? 'selected' : ''}>없음 (1.0x)</option>
                                <option value="1.5" ${statusBonus === 1.5 ? 'selected' : ''}>마비/화상/독 (1.5x)</option>
                                <option value="2.5" ${statusBonus === 2.5 ? 'selected' : ''}>잠듦/얼음 (2.5x)</option>
                            </select>
                            <label style="display:block; font-weight:bold; margin:15px 0 10px 0;">몬스터볼</label>
                            <select id="ball-select" style="width:100%; padding:8px; border-radius:8px;">
                                <option value="1.0" ${ballBonus === 1.0 ? 'selected' : ''}>몬스터볼 (1.0x)</option>
                                <option value="1.5" ${ballBonus === 1.5 ? 'selected' : ''}>수퍼볼 (1.5x)</option>
                                <option value="2.0" ${ballBonus === 2.0 ? 'selected' : ''}>하이퍼볼 (2.0x)</option>
                            </select>
                        </div>
                    </div>

                    <div style="text-align:center; padding:30px; background:#fff; border:3px solid #ed1c24; border-radius:16px; margin-top:20px;">
                        <h3 style="margin:0;">예상 포획 확률</h3>
                        <div id="catch-chance-result" style="font-size:3.5rem; font-weight:bold; color:#ed1c24; margin:10px 0;">
                            0%
                        </div>
                        <p id="selected-poke-display">선택된 포켓몬: <strong>-</strong></p>
                    </div>
                </div>
            `;
            attachEvents();
            updateValues();
        };

        const updateValues = () => {
            const chance = calculateCatchChance(captureRate, currentHpPercent, ballBonus, statusBonus);
            
            container.querySelector('#catch-chance-result')!.textContent = chance >= 100 ? '100%' : chance.toFixed(2) + '%';
            container.querySelector('#hp-display')!.textContent = `${currentHpPercent}%`;
            container.querySelector('#capture-rate-label')!.textContent = `기본 포획률: ${captureRate}`;
            
            const pokeDisplay = container.querySelector('#selected-poke-display')!;
            if (selectedPoke) {
                pokeDisplay.innerHTML = `선택된 포켓몬: <strong>${selectedPoke.nameKo}</strong>`;
            } else {
                pokeDisplay.innerHTML = '선택된 포켓몬: <strong>-</strong>';
            }
        };

        const attachEvents = () => {
            createAutocomplete({
                container: container.querySelector('#poke-autocomplete-container')!,
                label: '포켓몬 검색', placeholder: '이름 입력', data: fullData,
                initialValue: selectedPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { 
                    selectedPoke = p; captureRate = p.captureRate; updateValues(); 
                }
            });

            container.querySelector('#hp-range')?.addEventListener('input', (e) => {
                currentHpPercent = parseInt((e.target as HTMLInputElement).value);
                updateValues();
            });

            container.querySelector('#status-select')?.addEventListener('change', (e) => {
                statusBonus = parseFloat((e.target as HTMLSelectElement).value);
                updateValues();
            });

            container.querySelector('#ball-select')?.addEventListener('change', (e) => {
                ballBonus = parseFloat((e.target as HTMLSelectElement).value);
                updateValues();
            });
        };

        renderStructure();
        const unsubscribe = globalStore.subscribe(updateValues);
        return () => unsubscribe();
    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">오류: ${err}</p>`;
    }
    return () => {};
}
