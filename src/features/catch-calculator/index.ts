import { fetchPokedexData } from '../../data/pokeapi.js';
import type { PokemonData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { getQueryParams, updateQueryParams } from '../../state/url-params.js';

export async function renderCatchCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <p>데이터를 불러오는 중...</p>
        </div>
    `;

    try {
        const fullData = await fetchPokedexData();
        const params = getQueryParams();
        
        const initialPokeId = parseInt(params.pokeId || '25');
        let selectedPoke: PokemonData | null = fullData.find(p => p.id === initialPokeId) || (fullData.length > 0 ? fullData[0] : null);
        let currentHpPercent = parseInt(params.hp || '100');
        let statusBonus = parseFloat(params.status || '1.0');
        let ballBonus = parseFloat(params.ball || '1.0');
        let captureRate = selectedPoke?.captureRate || 255;

        const calculateCatchChance = () => {
            // X = [( (3*M - 2*H) * rate * ball ) / (3*M)] * status
            // Percent 기반으로 단순화: M=100, H=currentHpPercent
            const M = 100;
            const H = currentHpPercent;
            
            const firstPart = ((3 * M - 2 * H) * captureRate * ballBonus) / (3 * M);
            const X = firstPart * statusBonus;

            if (X >= 255) return 100;

            // b = 65536 / (255/X)^(1/4)
            const b = 65536 / Math.pow(255 / X, 0.25);
            const catchProb = Math.pow(b / 65536, 4) * 100;
            
            return Math.min(100, catchProb);
        };

        const renderUI = () => {
            const chance = calculateCatchChance();

            // URL 동기화
            updateQueryParams({
                pokeId: selectedPoke?.id || '',
                hp: currentHpPercent,
                status: statusBonus,
                ball: ballBonus
            });

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div>
                        <h2 style="margin-top:0;">포획률 계산기</h2>
                        <p style="color:#666; font-size:0.9em; margin-bottom:20px;">포켓몬의 남은 체력, 상태이상, 볼 종류에 따른 포획 확률을 계산합니다.</p>
                        
                        <div style="display:flex; flex-wrap:wrap; gap:20px; align-items:flex-start;">
                            <div style="flex: 1; min-width: 300px;">
                                <div style="position:relative; margin-bottom: 20px;">
                                    <label style="display:block; font-weight:bold; margin-bottom:5px;">포켓몬 선택</label>
                                    <input type="text" id="poke-search-input" placeholder="포켓몬 검색 (예: 피카츄)" value="${selectedPoke?.nameKo || ''}" style="width: 100%; padding: 10px; border: 2px solid #ed1c24; border-radius: 8px; font-size: 1.1rem; box-sizing: border-box;" />
                                    <div id="poke-dropdown" style="display:none; position:absolute; top: 100%; left:0; width:100%; max-height:200px; overflow-y:auto; background:#fff; border:1px solid #ccc; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:4px; z-index:100;"></div>
                                </div>

                                <div style="margin-bottom: 20px;">
                                    <label style="display:block; font-weight:bold; margin-bottom:5px;">기본 포획률 (Capture Rate)</label>
                                    <input type="number" id="capture-rate-input" value="${captureRate}" min="1" max="255" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 1.1rem; box-sizing: border-box;" />
                                    <p style="font-size:0.8em; color:#888; margin-top:5px;">* 포켓몬 선택 시 자동 입력되며, 직접 수정도 가능합니다.</p>
                                </div>

                                <div style="margin-bottom: 20px;">
                                    <label style="display:block; font-weight:bold; margin-bottom:5px;">남은 체력: <span id="hp-percent-display">${currentHpPercent}%</span></label>
                                    <input type="range" id="hp-percent-range" min="1" max="100" value="${currentHpPercent}" style="width: 100%;" />
                                    <div style="display:flex; gap:10px; margin-top:10px;">
                                        <button class="hp-quick-btn" data-val="100" style="padding:5px 10px; cursor:pointer;">100%</button>
                                        <button class="hp-quick-btn" data-val="50" style="padding:5px 10px; cursor:pointer;">50%</button>
                                        <button class="hp-quick-btn" data-val="10" style="padding:5px 10px; cursor:pointer;">10%</button>
                                        <button class="hp-quick-btn" data-val="1" style="padding:5px 10px; cursor:pointer;">1% (칼등치기)</button>
                                    </div>
                                </div>
                            </div>

                            <div style="flex: 1; min-width: 300px; background:rgba(0,0,0,0.02); padding:20px; border-radius:12px; border: 1px dashed #ccc;">
                                <div style="margin-bottom: 20px;">
                                    <label style="display:block; font-weight:bold; margin-bottom:10px;">상태 이상 (Status)</label>
                                    <div style="display:flex; flex-wrap:wrap; gap:10px;">
                                        <label style="padding:8px 12px; border:1px solid #ccc; border-radius:20px; cursor:pointer; background:${statusBonus === 1.0 ? '#eee' : '#fff'};">
                                            <input type="radio" name="status-bonus" value="1.0" ${statusBonus === 1.0 ? 'checked' : ''} style="display:none;" /> 없음 (1.0x)
                                        </label>
                                        <label style="padding:8px 12px; border:1px solid #ccc; border-radius:20px; cursor:pointer; background:${statusBonus === 1.5 ? '#eee' : '#fff'}; color:#f57c00;">
                                            <input type="radio" name="status-bonus" value="1.5" ${statusBonus === 1.5 ? 'checked' : ''} style="display:none;" /> 마비/화상/독 (1.5x)
                                        </label>
                                        <label style="padding:8px 12px; border:1px solid #ccc; border-radius:20px; cursor:pointer; background:${statusBonus === 2.5 ? '#eee' : '#fff'}; color:#673ab7;">
                                            <input type="radio" name="status-bonus" value="2.5" ${statusBonus === 2.5 ? 'checked' : ''} style="display:none;" /> 잠듦/얼음 (2.5x)
                                        </label>
                                    </div>
                                </div>

                                <div style="margin-bottom: 20px;">
                                    <label style="display:block; font-weight:bold; margin-bottom:10px;">몬스터볼 (Ball)</label>
                                    <select id="ball-select" style="width:100%; padding:10px; font-size:1rem; border-radius:8px; border:1px solid #ccc;">
                                        <option value="1.0" ${ballBonus === 1.0 ? 'selected' : ''}>몬스터볼 / 프레미어볼 / 럭셔리볼 (1.0x)</option>
                                        <option value="1.5" ${ballBonus === 1.5 ? 'selected' : ''}>수퍼볼 (1.5x)</option>
                                        <option value="2.0" ${ballBonus === 2.0 ? 'selected' : ''}>하이퍼볼 (2.0x)</option>
                                        <option value="3.0" ${ballBonus === 3.0 ? 'selected' : ''}>네트볼 (물/벌레 3.0x)</option>
                                        <option value="3.5" ${ballBonus === 3.5 ? 'selected' : ''}>다이브볼 (물속 3.5x)</option>
                                        <option value="4.0" ${ballBonus === 4.0 ? 'selected' : ''}>다크볼 (밤/동굴 4.0x)</option>
                                        <option value="5.0" ${ballBonus === 5.0 ? 'selected' : ''}>퀵볼 (첫턴 5.0x)</option>
                                        <option value="8.0" ${ballBonus === 8.0 ? 'selected' : ''}>리피드볼 (포획기록있음 8.0x)</option>
                                        <option value="255" ${ballBonus === 255 ? 'selected' : ''}>마스터볼 (100%)</option>
                                    </select>
                                    <p style="font-size:0.8em; color:#888; margin-top:5px;">* 특수 볼(헤비볼, 레벨볼 등)은 조건이 복잡하여 기본 배율만 제공합니다.</p>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top:40px; text-align:center; padding:30px; background:#f8f9fa; border-radius:16px; border:2px solid #ed1c24;">
                            <h3 style="margin:0; color:#666;">예상 포획 확률</h3>
                            <div style="font-size: 3.5rem; font-weight:bold; color:#ed1c24; margin:10px 0;">
                                ${chance >= 100 ? '100%' : chance.toFixed(2) + '%'}
                            </div>
                            <div style="display:flex; justify-content:center; gap:10px;">
                                ${selectedPoke ? `
                                    <div style="background:#fff; border-radius: 8px; padding: 10px; display:flex; align-items:center; gap:10px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPoke.id}.png" style="width:40px; height:40px; image-rendering:pixelated;" />
                                        <span style="font-weight:bold;">${selectedPoke.nameKo}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            attachEvents();
        };

        const attachEvents = () => {
            const searchInput = container.querySelector('#poke-search-input') as HTMLInputElement;
            const dropdown = container.querySelector('#poke-dropdown') as HTMLDivElement;
            const captureRateInput = container.querySelector('#capture-rate-input') as HTMLInputElement;
            const hpRange = container.querySelector('#hp-percent-range') as HTMLInputElement;
            const ballSelect = container.querySelector('#ball-select') as HTMLSelectElement;

            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase();
                if (term.length === 0) {
                    dropdown.style.display = 'none';
                    return;
                }
                const matches = fullData.filter(p => p.nameKo.includes(term) || p.nameEn.toLowerCase().includes(term)).slice(0, 50);
                dropdown.innerHTML = matches.map(m => `
                    <div class="dropdown-item" data-id="${m.id}" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
                        ${m.nameKo} <span style="color:#888; font-size:0.8em;">(${m.nameEn})</span>
                    </div>
                `).join('');
                dropdown.style.display = 'block';
            });

            dropdown.addEventListener('click', (e) => {
                const item = (e.target as HTMLElement).closest('.dropdown-item');
                if (item) {
                    const id = parseInt(item.getAttribute('data-id') || '0');
                    selectedPoke = fullData.find(x => x.id === id) || null;
                    if (selectedPoke) {
                        captureRate = selectedPoke.captureRate;
                    }
                    dropdown.style.display = 'none';
                    renderUI();
                }
            });

            captureRateInput.addEventListener('change', (e) => {
                captureRate = parseInt((e.target as HTMLInputElement).value) || 0;
                renderUI();
            });

            hpRange.addEventListener('input', (e) => {
                currentHpPercent = parseInt((e.target as HTMLInputElement).value);
                container.querySelector('#hp-percent-display')!.textContent = `${currentHpPercent}%`;
                // 렌더 전체를 다시 하진 않고 값만 계산해서 결과창만 업데이트할 수도 있지만, 일관성을 위해 renderUI 호출
                renderUI();
            });

            container.querySelectorAll('.hp-quick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentHpPercent = parseInt(btn.getAttribute('data-val') || '100');
                    renderUI();
                });
            });

            container.querySelectorAll('input[name="status-bonus"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    statusBonus = parseFloat((e.target as HTMLInputElement).value);
                    renderUI();
                });
            });

            ballSelect.addEventListener('change', (e) => {
                ballBonus = parseFloat((e.target as HTMLSelectElement).value);
                renderUI();
            });
        };

        renderUI();

    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">오류가 발생했습니다.<br/>${err}</p>`;
    }

    return () => {};
}
