import { fetchPokedexData } from '../../data/pokeapi.js';
import type { PokemonData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { getQueryParams, updateQueryParams } from '../../state/url-params.js';
import { globalStore } from '../../state/store.js';

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
            const currentGen = globalStore.getState().generation;

            // URL 동기화
            updateQueryParams({
                pokeId: selectedPoke?.id || '',
                hp: currentHpPercent,
                status: statusBonus,
                ball: ballBonus
            });

            container.innerHTML = `
                <div class="catch-calculator-container" style="display:flex; flex-direction:column; gap:20px;">
                    <div>
                        <h2 style="margin-top:0;">포획 정보 및 계산기</h2>
                        <p style="color:#666; font-size:0.9em; margin-bottom:20px;">포켓몬의 포획 확률과 출현 위치(서식지) 정보를 확인하세요.</p>
                        
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
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                                        <label style="font-weight:bold;">남은 체력 (%)</label>
                                        <input type="number" id="hp-percent-input" value="${currentHpPercent}" min="1" max="100" style="width: 60px; padding: 4px; text-align:center; border: 1px solid #ccc; border-radius: 4px;" />
                                    </div>
                                    <input type="range" id="hp-percent-range" min="1" max="100" value="${currentHpPercent}" style="width: 100%;" />
                                </div>
                            </div>

                            <div style="flex: 1; min-width: 300px; background:rgba(0,0,0,0.02); padding:20px; border-radius:12px; border: 1px dashed #ccc;">
                                <div style="margin-bottom: 20px;">
                                    <label style="display:block; font-weight:bold; margin-bottom:10px;">상태 이상 (Status)</label>
                                    <div class="status-options-container" style="display:flex; flex-wrap:wrap; gap:10px;">
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
                            <div class="catch-chance-value" style="font-size: 3.5rem; font-weight:bold; color:#ed1c24; margin:10px 0;">
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

                        <div id="habitat-section" style="margin-top:40px; border-top: 1px solid #eee; padding-top:30px;">
                            <h3 style="margin-top:0; margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                                🗺️ 서식지 및 출현 위치
                                <span style="font-weight:normal; font-size:0.8rem; color:#888;">(전체 버전 정보)</span>
                            </h3>
                            
                            ${selectedPoke && selectedPoke.encounters.length > 0 ? (() => {
                                // 세대별로 그룹화
                                const grouped = selectedPoke.encounters.reduce((acc, enc) => {
                                    if (!acc[enc.genId]) acc[enc.genId] = [];
                                    acc[enc.genId].push(enc);
                                    return acc;
                                }, {} as Record<number, typeof selectedPoke.encounters>);

                                // 세대 오름차순으로 정렬하여 렌더링
                                return Object.entries(grouped)
                                    .sort(([a], [b]) => Number(a) - Number(b))
                                    .map(([genId, items]) => {
                                        const isCurrentGen = genId.toString() === currentGen.toString();
                                        return `
                                            <div style="margin-bottom:30px; ${!isCurrentGen ? 'opacity:0.8;' : ''}">
                                                <h4 style="margin: 0 0 12px 0; display:flex; align-items:center; gap:8px; color:${isCurrentGen ? '#ed1c24' : '#444'}; font-size:1.1rem;">
                                                    <span style="background:${isCurrentGen ? '#ed1c24' : '#666'}; color:#fff; padding:2px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">GEN ${genId}</span>
                                                    ${genId}세대 게임 시리즈
                                                </h4>
                                                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:12px;">
                                                    ${items.map(enc => `
                                                        <div class="encounter-card" style="padding:16px; border-radius:12px; background:#fff; border: 1px solid ${isCurrentGen ? '#ed1c24' : '#eee'}; box-shadow: 0 2px 8px rgba(0,0,0,0.04); position:relative; overflow:hidden;">
                                                            ${isCurrentGen ? `<div style="position:absolute; top:0; left:0; width:4px; height:100%; background:#ed1c24;"></div>` : ''}
                                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                                                <span style="font-weight:bold; font-size:1rem; color:${isCurrentGen ? '#ed1c24' : '#333'}">${enc.versionName}</span>
                                                            </div>
                                                            <div style="font-size:0.85rem; color:#555; line-height:1.5;">
                                                                <div style="display:flex; flex-wrap:wrap; gap:5px;">
                                                                    ${enc.locations.map(loc => `<span style="background:#f0f0f0; padding:2px 8px; border-radius:4px;">${loc}</span>`).join('')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        `;
                                    }).join('');
                            })() : `
                                <div style="text-align:center; padding:20px 40px; background:#f9f9f9; border-radius:12px; color:#999; border: 1px dashed #ddd; margin-bottom:20px;">
                                    <p style="margin:0; font-style:italic;">출현 위치 정보가 없거나 야생에서 포획할 수 없는 포켓몬입니다.</p>
                                    <p style="margin:5px 0 0 0; font-size:0.8rem;">(진화, 통신교환, 이벤트 등으로만 획득 가능할 수 있습니다)</p>
                                </div>
                            `}

                            ${selectedPoke ? `
                                <div style="margin-top:20px; padding:25px; background:rgba(0,164,149,0.05); border-radius:16px; border:1px solid rgba(0,164,149,0.2); text-align:center;">
                                    <p style="margin:0 0 15px 0; font-size:0.95rem; color:#444; line-height:1.6;">
                                        더 상세한 포획 방법이나 8·9세대의 최신 정보가 필요하시다면<br/>
                                        나무위키의 <b>'포획'</b> 또는 <b>'획득 방법'</b> 섹션을 참고해 보세요!
                                    </p>
                                    <a href="https://namu.wiki/w/${encodeURIComponent(selectedPoke.nameKo)}#s-5" target="_blank" style="display:inline-block; padding:12px 24px; background:#00a495; color:#fff; text-decoration:none; border-radius:10px; font-size:1rem; font-weight:bold; box-shadow:0 4px 12px rgba(0,164,149,0.2); transition: transform 0.2s, box-shadow 0.2s;">
                                        🌳 ${selectedPoke.nameKo} 나무위키에서 포획 정보 확인
                                    </a>
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
            const hpInput = container.querySelector('#hp-percent-input') as HTMLInputElement;
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
                hpInput.value = currentHpPercent.toString();
                
                // UI 전체를 리렌더링하지 않고 값만 업데이트 (부드러운 드래깅을 위해)
                const chance = calculateCatchChance();
                const chanceEl = container.querySelector('.catch-chance-value');
                if (chanceEl) {
                    chanceEl.textContent = chance >= 100 ? '100%' : chance.toFixed(2) + '%';
                }
            });

            hpRange.addEventListener('change', () => {
                // 드래그가 끝났을 때 URL 파라미터 동기화 등을 위해 최종 렌더링
                renderUI();
            });

            hpInput.addEventListener('change', (e) => {
                let val = parseInt((e.target as HTMLInputElement).value) || 1;
                if (val > 100) val = 100;
                if (val < 1) val = 1;
                currentHpPercent = val;
                renderUI();
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

        // 전역 스토어 구독 (세대 설정 변경 시 UI 업데이트)
        const unsubscribe = globalStore.subscribe(() => {
            renderUI();
        });

        return () => {
            unsubscribe();
        };

    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">오류가 발생했습니다.<br/>${err}</p>`;
    }

    return () => {};
}
