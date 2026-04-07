import { fetchPokedexData } from '../../data/pokeapi.js';
import type { PokemonData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
type StatKey = typeof STAT_KEYS[number];

const STAT_NAMES: Record<StatKey, string> = {
    hp: 'HP', atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드'
};

const STAT_COLORS: Record<StatKey, string> = {
    hp: '#e53935', atk: '#f57c00', def: '#fbc02d', spa: '#1e88e5', spd: '#4caf50', spe: '#e91e63'
};

export async function renderStatCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <p>데이터를 불러오는 중...</p>
        </div>
    `;

    try {
        const fullData = await fetchPokedexData();
        
        let selectedPoke: PokemonData | null = fullData.find(p => p.id === 445) || (fullData.length > 0 ? fullData[0] : null);
        let baseStats: Record<StatKey, number> = selectedPoke ? { ...selectedPoke.stats as any } : { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        let level = 50;
        let ivs: Record<StatKey, number> = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        let evs: Record<StatKey, number> = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        let naturePlus: StatKey | 'none' = 'none';
        let natureMinus: StatKey | 'none' = 'none';

        const calcStat = (key: StatKey) => {
            const base = baseStats[key];
            const iv = ivs[key];
            const ev = evs[key];
            
            if (key === 'hp') {
                if (base === 1) return 1; // 껍질몬 등 특수 케이스 대응 가능하게 (기본 1이면 1 고정은 아니지만 여기선 단순화)
                return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
            } else {
                let modifier = 1.0;
                if (naturePlus === key && natureMinus !== key) modifier = 1.1;
                if (natureMinus === key && naturePlus !== key) modifier = 0.9;
                
                const preObj = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
                return Math.floor(preObj * modifier);
            }
        };

        const renderUI = () => {
            const evTotal = Object.values(evs).reduce((a, b) => a + b, 0);

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
                        <div>
                            <h2 style="margin-top:0;">실수값(실능) 계산기</h2>
                            <p style="color:#666; font-size:0.9em; margin-bottom:10px;">배틀용 스탯을 정확한 본가 공식으로 연산합니다.</p>
                            
                            <div style="position:relative; margin-bottom: 20px;">
                                <input type="text" id="poke-search-input" placeholder="포켓몬 검색 (예: 한카리아스)" value="${selectedPoke?.nameKo || ''}" style="width: 100%; padding: 10px; border: 2px solid #007bff; border-radius: 8px; font-size: 1.1rem; box-sizing: border-box;" />
                                <div id="poke-dropdown" style="display:none; position:absolute; top: 100%; left:0; width:100%; max-height:200px; overflow-y:auto; background:#fff; border:1px solid #ccc; box-shadow:0 4px 6px rgba(0,0,0,0.1); border-radius:4px; z-index:100;"></div>
                            </div>

                            <label style="font-weight:bold; display:block; margin-bottom:10px;">
                                레벨 (Level) : <input type="number" id="level-input" value="${level}" min="1" max="100" style="width: 60px; padding: 5px; font-size: 1.1rem;" />
                            </label>
                            
                            <button id="btn-nature-table" style="padding: 8px 15px; background: #673ab7; color: #fff; border:none; border-radius: 6px; cursor:pointer; font-weight:bold;">📋 성격(Nature) 표 보기</button>
                        </div>
                        
                        ${selectedPoke ? `
                        <div style="background:rgba(0,0,0,0.05); border-radius: 12px; padding: 20px; text-align:center; min-width: 180px;">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPoke.id}.png" style="width:96px; height:96px; image-rendering:pixelated; background:#fff; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:block; margin: 0 auto 10px;" />
                            <h3 style="margin:0;">${selectedPoke.nameKo} <span style="font-size:0.6em; color:#888;">#${String(selectedPoke.speciesId).padStart(3,'0')}</span></h3>
                            <div style="margin-top:5px;">
                                ${selectedPoke.types.map(t => `<span style="display:inline-block; padding: 3px 8px; background: ${TYPE_COLORS[t]}; color:#fff; border-radius:4px; font-size:0.8em; margin:2px;">${TYPE_NAMES_KO[t] || t}</span>`).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <div style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h3 style="margin:0;">능력치 (상세 조절)</h3>
                            <span style="font-size:0.9em; font-weight:bold; color: ${evTotal > 510 ? 'red' : '#333'};">노력치 총합: ${evTotal} / 510</span>
                        </div>
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse: collapse; text-align:center; min-width:600px;">
                                <thead>
                                    <tr style="background:#f5f5f5; border-bottom: 2px solid #ddd;">
                                        <th style="padding:10px;">스탯</th>
                                        <th style="padding:10px; width:70px;">종족값</th>
                                        <th style="padding:10px; width:80px;">개체(IV)</th>
                                        <th style="padding:10px; width:150px;">노력치(EV)</th>
                                        <th style="padding:10px; width:130px;">성격 보정 (+/-)</th>
                                        <th style="padding:10px; font-size: 1.1em; color:#d32f2f;">실수값</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${STAT_KEYS.map(key => `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding:10px; font-weight:bold; color:${STAT_COLORS[key]}">${STAT_NAMES[key]}</td>
                                            <td style="padding:10px;">
                                                <input type="number" class="base-stat-input" data-stat="${key}" value="${baseStats[key]}" min="1" max="255" style="width: 50px; text-align:center; font-size:1.1em;" />
                                            </td>
                                            <td style="padding:10px;">
                                                <input type="number" class="iv-input" data-stat="${key}" value="${ivs[key]}" min="0" max="31" style="width: 50px; text-align:center;" />
                                            </td>
                                            <td style="padding:10px;">
                                                <div style="display:flex; justify-content:center; align-items:center; gap:5px;">
                                                    <input type="number" class="ev-input" data-stat="${key}" value="${evs[key]}" min="0" max="252" step="4" style="width: 55px; text-align:center;" />
                                                    <div style="display:flex; flex-direction:column; gap:2px;">
                                                        <button class="ev-btn" data-stat="${key}" data-val="252" style="font-size:0.7em; padding:2px 4px; cursor:pointer;">252</button>
                                                        <button class="ev-btn" data-stat="${key}" data-val="0" style="font-size:0.7em; padding:2px 4px; cursor:pointer;">0</button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding:10px;">
                                                ${key === 'hp' ? '<span style="color:#aaa;">-</span>' : `
                                                    <label style="color:red; font-size:1.2em; font-weight:bold; cursor:pointer; user-select:none;">
                                                        <input type="radio" name="nature-plus" value="${key}" ${naturePlus === key ? 'checked' : ''} /> +
                                                    </label>
                                                    <label style="color:blue; font-size:1.2em; font-weight:bold; cursor:pointer; user-select:none; margin-left:10px;">
                                                        <input type="radio" name="nature-minus" value="${key}" ${natureMinus === key ? 'checked' : ''} /> -
                                                    </label>
                                                `}
                                            </td>
                                            <td style="padding:10px; font-size:1.5em; font-weight:bold; color:#d32f2f;">
                                                ${calcStat(key)}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- 성격 모달 -->
                <div id="nature-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;">
                    <div style="background:#fff; color:#333; width:95%; max-width:600px; border-radius:12px; padding:20px; position:relative; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                        <button id="modal-close" style="position:absolute; top:15px; right:15px; background:none; border:none; font-size:1.5em; cursor:pointer; color:#888;">&times;</button>
                        <h2 style="margin-top:0;">성격(Nature) 표</h2>
                        <table style="width:100%; border-collapse:collapse; text-align:center; font-size:0.9em;">
                            <thead>
                                <tr style="background:#eee;">
                                    <th style="padding:8px; border:1px solid #ccc;">(행)증가 / (열)감소</th>
                                    <th style="padding:8px; border:1px solid #ccc; color:#f57c00;">공격(-)</th>
                                    <th style="padding:8px; border:1px solid #ccc; color:#fbc02d;">방어(-)</th>
                                    <th style="padding:8px; border:1px solid #ccc; color:#1e88e5;">특공(-)</th>
                                    <th style="padding:8px; border:1px solid #ccc; color:#4caf50;">특방(-)</th>
                                    <th style="padding:8px; border:1px solid #ccc; color:#e91e63;">스핏(-)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <th style="padding:8px; border:1px solid #ccc; background:#f9f9f9; color:#f57c00;">공격(+)</th>
                                    <td style="border:1px solid #ccc;">노력 (Hardy)</td><td style="border:1px solid #ccc;">외로운 (Lonely)</td><td style="border:1px solid #ccc;">고집 (Adamant)</td><td style="border:1px solid #ccc;">개구쟁이 (Naughty)</td><td style="border:1px solid #ccc;">용감 (Brave)</td>
                                </tr>
                                <tr>
                                    <th style="padding:8px; border:1px solid #ccc; background:#f9f9f9; color:#fbc02d;">방어(+)</th>
                                    <td style="border:1px solid #ccc;">대담 (Bold)</td><td style="border:1px solid #ccc;">성실 (Docile)</td><td style="border:1px solid #ccc;">장난꾸러기 (Impish)</td><td style="border:1px solid #ccc;">촐랑 (Lax)</td><td style="border:1px solid #ccc;">무사태평 (Relaxed)</td>
                                </tr>
                                <tr>
                                    <th style="padding:8px; border:1px solid #ccc; background:#f9f9f9; color:#1e88e5;">특공(+)</th>
                                    <td style="border:1px solid #ccc;">조심 (Modest)</td><td style="border:1px solid #ccc;">의젓 (Mild)</td><td style="border:1px solid #ccc;">수줍은 (Bashful)</td><td style="border:1px solid #ccc;">덜렁 (Rash)</td><td style="border:1px solid #ccc;">냉정 (Quiet)</td>
                                </tr>
                                <tr>
                                    <th style="padding:8px; border:1px solid #ccc; background:#f9f9f9; color:#4caf50;">특방(+)</th>
                                    <td style="border:1px solid #ccc;">차분 (Calm)</td><td style="border:1px solid #ccc;">얌전 (Gentle)</td><td style="border:1px solid #ccc;">신중 (Careful)</td><td style="border:1px solid #ccc;">변덕 (Quirky)</td><td style="border:1px solid #ccc;">건방 (Sassy)</td>
                                </tr>
                                <tr>
                                    <th style="padding:8px; border:1px solid #ccc; background:#f9f9f9; color:#e91e63;">스핏(+)</th>
                                    <td style="border:1px solid #ccc;">겁쟁이 (Timid)</td><td style="border:1px solid #ccc;">성급 (Hasty)</td><td style="border:1px solid #ccc;">명랑 (Jolly)</td><td style="border:1px solid #ccc;">천진난만 (Naive)</td><td style="border:1px solid #ccc;">온순 (Serious)</td>
                                </tr>
                            </tbody>
                        </table>
                        <p style="font-size:0.8em; color:#888; margin-top:10px;">* 대각선의 무보정 성격들(노력, 성실, 수줍은, 변덕, 온순)은 증가와 감소가 상쇄되어 1.0배 (보정 없음) 배율을 갖습니다.</p>
                    </div>
                </div>
            `;
            attachEvents();
        };

        const attachEvents = () => {
            const searchInput = container.querySelector('#poke-search-input') as HTMLInputElement;
            const dropdown = container.querySelector('#poke-dropdown') as HTMLDivElement;
            const btnNatureTable = container.querySelector('#btn-nature-table') as HTMLButtonElement;
            const modal = container.querySelector('#nature-modal') as HTMLElement;
            const modalClose = container.querySelector('#modal-close') as HTMLElement;
            const levelInput = container.querySelector('#level-input') as HTMLInputElement;

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
                        baseStats = { ...selectedPoke.stats as any };
                    }
                    dropdown.style.display = 'none';
                    renderUI();
                }
            });

            levelInput.addEventListener('change', (e) => {
                level = parseInt((e.target as HTMLInputElement).value) || 50;
                renderUI();
            });

            container.querySelectorAll('.base-stat-input').forEach(el => {
                el.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const stat = target.getAttribute('data-stat') as StatKey;
                    let val = parseInt(target.value) || 0;
                    if (val > 255) val = 255;
                    if (val < 1) val = 1;
                    baseStats[stat] = val;
                    renderUI();
                });
            });

            container.querySelectorAll('.iv-input').forEach(el => {
                el.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const stat = target.getAttribute('data-stat') as StatKey;
                    let val = parseInt(target.value) || 0;
                    if (val > 31) val = 31;
                    if (val < 0) val = 0;
                    ivs[stat] = val;
                    renderUI();
                });
            });

            container.querySelectorAll('.ev-input').forEach(el => {
                el.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    const stat = target.getAttribute('data-stat') as StatKey;
                    let val = parseInt(target.value) || 0;
                    if (val > 252) val = 252;
                    if (val < 0) val = 0;
                    evs[stat] = val;
                    renderUI();
                });
            });

            container.querySelectorAll('.ev-btn').forEach(el => {
                el.addEventListener('click', (e) => {
                    const target = e.target as HTMLButtonElement;
                    const stat = target.getAttribute('data-stat') as StatKey;
                    const val = parseInt(target.getAttribute('data-val') || '0');
                    evs[stat] = val;
                    renderUI();
                });
            });

            container.querySelectorAll('input[name="nature-plus"]').forEach(el => {
                el.addEventListener('change', (e) => {
                    if ((e.target as HTMLInputElement).checked) {
                        naturePlus = (e.target as HTMLInputElement).value as StatKey;
                        renderUI();
                    }
                });
            });
            container.querySelectorAll('input[name="nature-minus"]').forEach(el => {
                el.addEventListener('change', (e) => {
                    if ((e.target as HTMLInputElement).checked) {
                        natureMinus = (e.target as HTMLInputElement).value as StatKey;
                        renderUI();
                    }
                });
            });

            btnNatureTable.addEventListener('click', () => modal.style.display = 'flex');
            modalClose.addEventListener('click', () => modal.style.display = 'none');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        };

        renderUI();

    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">오류가 발생했습니다.<br/>${err}</p>`;
    }

    return () => {};
}
