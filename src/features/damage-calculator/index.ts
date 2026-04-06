import { fetchPokedexData, fetchMovesData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO, TYPE_MATCHUPS, POKEMON_TYPES } from '../../data/constants.js';
import type { PokemonType } from '../../data/constants.js';

export async function renderDamageCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <div class="spinner" style="border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: var(--primary-color, #1976d2); animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <p style="margin-top: 15px; color: var(--text-color, #333);">포켓몬과 기술 데이터를 불러오는 중입니다...</p>
        </div>
    `;

    try {
        const [fullPokes, fullMoves] = await Promise.all([
            fetchPokedexData(),
            fetchMovesData()
        ]);

        // State variables
        let atkPoke: PokemonData | null = null;
        let atkStatVal = 100;
        let spaStatVal = 100;
        let atkRank = 0;
        let spaRank = 0;
        
        let selectedMove: MoveData | null = null;
        let movePower = 90;
        let moveType: string = 'normal';
        let moveCategory: 'physical' | 'special' = 'physical';
        
        let defPoke: PokemonData | null = null;
        let hpVal = 100;
        let defVal = 100;
        let spdVal = 100;
        let defRank = 0;
        let spdRank = 0;

        let weather: 'none' | 'sun' | 'rain' | 'sand' | 'snow' = 'none';
        let terrain: 'none' | 'electric' | 'grassy' | 'psychic' | 'misty' = 'none';
        let screenOn = false;

        let stabMod = 1.0;
        let typeMulti = 1.0;
        let itemMod = 1.0;

        const rankMultipliers: Record<number, number> = {
            '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
            '0': 1,
            '1': 3/2, '2': 4/2, '3': 5/2, '4': 6/2, '5': 7/2, '6': 8/2
        };

        const calcHp = (base: number, ev252: boolean) => {
            const ev = ev252 ? 252 : 0;
            return Math.floor((2 * base + 31 + Math.floor(ev / 4)) * 50 / 100) + 50 + 10;
        };
        const calcStat = (base: number, ev252: boolean, naturePlus: boolean) => {
            const ev = ev252 ? 252 : 0;
            const raw = Math.floor((2 * base + 31 + Math.floor(ev / 4)) * 50 / 100) + 5;
            return Math.floor(raw * (naturePlus ? 1.1 : 1.0));
        };

        const calculateDamageRange = () => {
            if (!movePower) return { rolls: [0], pcts: [0], text: '데미지 0' };

            // 1. 공격 스탯 결정
            let rawAtk = moveCategory === 'physical' ? atkStatVal : spaStatVal;
            let currentAtkRank = moveCategory === 'physical' ? atkRank : spaRank;
            let atk = Math.floor(rawAtk * rankMultipliers[currentAtkRank]);

            // 2. 방어 스탯 결정
            let rawDef = moveCategory === 'physical' ? defVal : spdVal;
            let currentDefRank = moveCategory === 'physical' ? defRank : spdRank;
            // 눈팟 방어력 업, 모래바람 특방 업
            if (weather === 'snow' && moveCategory === 'physical' && defPoke?.types?.includes('ice' as any)) rawDef = Math.floor(rawDef * 1.5);
            if (weather === 'sand' && moveCategory === 'special' && defPoke?.types?.includes('rock' as any)) rawDef = Math.floor(rawDef * 1.5);

            let def = Math.floor(rawDef * rankMultipliers[currentDefRank]);
            if (def < 1) def = 1;

            // 3. 베이스 데미지
            let baseDmg = Math.floor(Math.floor(22 * movePower * atk / def) / 50) + 2;

            // 4. 벽, 날씨, 필드 곱연산
            if (screenOn) {
                baseDmg = Math.floor(baseDmg * 0.5);
            }

            let weatherBoost = 1.0;
            if (weather === 'sun') {
                if (moveType === 'fire') weatherBoost = 1.5;
                if (moveType === 'water') weatherBoost = 0.5;
            } else if (weather === 'rain') {
                if (moveType === 'water') weatherBoost = 1.5;
                if (moveType === 'fire') weatherBoost = 0.5;
            }
            baseDmg = Math.floor(baseDmg * weatherBoost);

            let terrainBoost = 1.0;
            if (terrain === 'electric' && moveType === 'electric') terrainBoost = 1.3;
            if (terrain === 'grassy' && moveType === 'grass') terrainBoost = 1.3;
            if (terrain === 'psychic' && moveType === 'psychic') terrainBoost = 1.3;
            if (terrain === 'misty' && moveType === 'dragon') terrainBoost = 0.5;
            baseDmg = Math.floor(baseDmg * terrainBoost);

            // 5. 난수 롤 (16단계)
            const rolls = [];
            for (let i = 85; i <= 100; i++) {
                let dmg = baseDmg;
                dmg = Math.floor(dmg * i / 100); // 난수
                dmg = Math.floor(dmg * stabMod); // 자속
                dmg = Math.floor(dmg * typeMulti); // 상성
                dmg = Math.floor(dmg * itemMod); // 도구 등
                rolls.push(dmg);
            }

            const pcts = rolls.map(r => (r / hpVal) * 100);

            // 타수 판별
            const max = rolls[15] ?? 0;
            const min = rolls[0] ?? 0;
            let text = '';
            
            if (min >= hpVal) text = '<span style="color:#d32f2f; font-weight:bold;">확정 1타</span>';
            else if (max >= hpVal) {
                const chance = ((rolls.filter(r => r >= hpVal).length) / 16) * 100;
                text = `<span style="color:#f57c00; font-weight:bold;">난수 1타 (${chance.toFixed(1)}%)</span>`;
            }
            else if (min * 2 >= hpVal) text = '<span style="color:#1976d2; font-weight:bold;">확정 2타</span>';
            else if (max * 2 >= hpVal) {
                text = `<span style="color:#388e3c; font-weight:bold;">난수 2타</span>`;
            }
            else if (min * 3 >= hpVal) text = '확정 3타';
            else if (max * 3 >= hpVal) text = '난수 3타';
            else text = '4타 이상 (매우 단단함)';

            return { rolls, pcts, text };
        };

        const renderUI = () => {
            const { rolls, pcts, text } = calculateDamageRange();
            const minDmg = rolls[0] || 0;
            const maxDmg = rolls[15] || 0;
            const minPct = pcts[0] || 0;
            const maxPct = pcts[15] || 0;

            // 타입 목록 옵션 생성
            const typeOptions = POKEMON_TYPES.map(t => `<option value="${t}" ${moveType === t ? 'selected' : ''}>${TYPE_NAMES_KO[t]}</option>`).join('');

            container.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto;">
                    <h2 style="margin-top:0;">종합 데미지 계산기 <span style="font-size:0.5em; color:#888;">(9세대 기준 난수/타수 시뮬레이터)</span></h2>

                    <div style="display:flex; flex-wrap:wrap; gap:15px; align-items: stretch;">

                        <!-- 좌측: 공격측 -->
                        <div style="flex:1; min-width:320px; border:2px solid #e53935; border-radius:12px; padding:15px; background:#fffaf9; display:flex; flex-direction:column; gap:12px;">
                            <h3 style="color:#e53935; margin:0; border-bottom:1px solid #ffcdd2; padding-bottom:8px;">⚔️ 공격 공격수 (Attacker)</h3>
                            
                            <div style="display:flex; gap:10px;">
                                <div style="flex:1; position:relative;">
                                    <input type="text" id="atk-poke-search" placeholder="포켓몬 검색" value="${atkPoke?.nameKo || ''}" style="width:100%; padding:6px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;" />
                                    <div id="atk-poke-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:150px; overflow-y:auto; background:#fff; border:1px solid #ccc; z-index:10; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                                </div>
                            </div>
                            
                            <!-- 샘플 버튼 -->
                            <div style="display:flex; gap:5px;">
                                <button id="btn-atk-phys" style="flex:1; font-size:0.8em; padding:4px; cursor:pointer;">극물리 샘플</button>
                                <button id="btn-atk-spec" style="flex:1; font-size:0.8em; padding:4px; cursor:pointer;">극특수 샘플</button>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background:#fff; padding:10px; border-radius:8px; border:1px solid #ffebee;">
                                <div>
                                    <span style="font-size:0.75em; color:#d32f2f; font-weight:bold;">공격 실수값</span>
                                    <input type="number" id="atk-stat-val" value="${atkStatVal}" style="width:100%; padding:4px; box-sizing:border-box;" />
                                    <span style="font-size:0.75em; color:#666; margin-top:2px; display:block;">랭크업: <input type="number" id="atk-rank" value="${atkRank}" min="-6" max="6" style="width:40px;" /></span>
                                </div>
                                <div>
                                    <span style="font-size:0.75em; color:#1976d2; font-weight:bold;">특공 실수값</span>
                                    <input type="number" id="spa-stat-val" value="${spaStatVal}" style="width:100%; padding:4px; box-sizing:border-box;" />
                                    <span style="font-size:0.75em; color:#666; margin-top:2px; display:block;">랭크업: <input type="number" id="spa-rank" value="${spaRank}" min="-6" max="6" style="width:40px;" /></span>
                                </div>
                            </div>

                            <h4 style="margin:5px 0 0 0; font-size:0.9em; color:#333;">사용 기술</h4>
                            <div style="position:relative;">
                                <input type="text" id="move-search" placeholder="기술 검색 (예: 지진)" value="${selectedMove?.nameKo || ''}" style="width:100%; padding:6px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;" />
                                <div id="move-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:150px; overflow-y:auto; background:#fff; border:1px solid #ccc; z-index:10; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                            </div>
                            
                            <div style="display:flex; gap:10px; align-items:center;">
                                <div style="flex:1;">
                                    <span style="font-size:0.75em; color:#666;">위력</span>
                                    <input type="number" id="move-power-val" value="${movePower}" style="width:100%; padding:4px; box-sizing:border-box;" />
                                </div>
                                <div style="flex:1;">
                                    <span style="font-size:0.75em; color:#666;">타입</span>
                                    <select id="move-type" style="width:100%; padding:4px; box-sizing:border-box;">
                                        ${typeOptions}
                                    </select>
                                </div>
                                <div style="flex:1;">
                                    <span style="font-size:0.75em; color:#666;">분류</span>
                                    <select id="move-category" style="width:100%; padding:4px; box-sizing:border-box;">
                                        <option value="physical" ${moveCategory === 'physical' ? 'selected' : ''}>물리</option>
                                        <option value="special" ${moveCategory === 'special' ? 'selected' : ''}>특수</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display:flex; gap:10px;">
                                <div style="flex:1;">
                                    <span style="font-size:0.75em; color:#666;">자속(STAB)</span>
                                    <select id="stab-mod" style="width:100%; padding:4px;">
                                        <option value="1.0" ${stabMod === 1.0 ? 'selected' : ''}>X (1.0)</option>
                                        <option value="1.5" ${stabMod === 1.5 ? 'selected' : ''}>O (1.5)</option>
                                        <option value="2.0" ${stabMod === 2.0 ? 'selected' : ''}>테라스탈 (2.0)</option>
                                        <option value="2.25" ${stabMod === 2.25 ? 'selected' : ''}>적응력+테라 (2.25)</option>
                                    </select>
                                </div>
                                <div style="flex:1;">
                                    <span style="font-size:0.75em; color:#666;">도구/특성</span>
                                    <select id="item-mod" style="width:100%; padding:4px;">
                                        <option value="1.0" ${itemMod === 1.0 ? 'selected' : ''}>1.0배</option>
                                        <option value="1.2" ${itemMod === 1.2 ? 'selected' : ''}>1.2배</option>
                                        <option value="1.3" ${itemMod === 1.3 ? 'selected' : ''}>1.3배(생구)</option>
                                        <option value="1.5" ${itemMod === 1.5 ? 'selected' : ''}>1.5배(머리띠)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- 중앙: 환경 & 결과 -->
                        <div style="flex:1.2; min-width:320px; border:2px solid #9c27b0; border-radius:12px; padding:15px; background:#fbf2ff; display:flex; flex-direction:column; gap:15px; justify-content:space-between;">
                            <div>
                                <h3 style="color:#9c27b0; margin:0; border-bottom:1px solid #e1bee7; padding-bottom:8px;">🌍 배틀 환경 & 시뮬레이터</h3>
                                
                                <div style="display:flex; gap:10px; margin-top:10px;">
                                    <label style="flex:1; font-size:0.8em; color:#666;">날씨
                                        <select id="weather-select" style="width:100%; padding:4px;">
                                            <option value="none" ${weather === 'none' ? 'selected' : ''}>없음</option>
                                            <option value="sun" ${weather === 'sun' ? 'selected' : ''}>쾌청 (불꽃↑ 물↓)</option>
                                            <option value="rain" ${weather === 'rain' ? 'selected' : ''}>비 (물↑ 불꽃↓)</option>
                                            <option value="sand" ${weather === 'sand' ? 'selected' : ''}>모래 (바위특방↑)</option>
                                            <option value="snow" ${weather === 'snow' ? 'selected' : ''}>눈 (얼음방어↑)</option>
                                        </select>
                                    </label>
                                    <label style="flex:1; font-size:0.8em; color:#666;">필드
                                        <select id="terrain-select" style="width:100%; padding:4px;">
                                            <option value="none" ${terrain === 'none' ? 'selected' : ''}>없음</option>
                                            <option value="electric" ${terrain === 'electric' ? 'selected' : ''}>일렉트릭 (전기↑)</option>
                                            <option value="grassy" ${terrain === 'grassy' ? 'selected' : ''}>그래스 (풀↑)</option>
                                            <option value="psychic" ${terrain === 'psychic' ? 'selected' : ''}>사이코 (에스퍼↑)</option>
                                            <option value="misty" ${terrain === 'misty' ? 'selected' : ''}>미스티 (드래곤↓)</option>
                                        </select>
                                    </label>
                                    <label style="flex:1; font-size:0.8em; color:#666;">빛벽/명상
                                        <div style="margin-top:5px;"><input type="checkbox" id="screen-check" ${screenOn ? 'checked' : ''} /> 장막 적용</div>
                                    </label>
                                </div>

                                <div style="margin-top:15px; background:#fff; padding:10px; border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
                                    <span style="font-weight:bold; color:#555;">타입 상성 (자동계산)</span>
                                    <span>
                                        <input type="number" id="type-multi" value="${typeMulti}" step="0.25" style="width:60px; padding:4px; font-weight:bold; color:#d32f2f; text-align:center;" /> 배
                                    </span>
                                </div>
                            </div>

                            <div style="background:#fff; border:3px solid #ab47bc; border-radius:12px; padding:20px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                                <div style="font-size:1.4em; font-weight:bold; margin-bottom:10px;">${text}</div>
                                <div style="font-size:0.9em; color:#666;">데미지 (체력비례)</div>
                                <div style="font-size:1.8em; font-weight:bold; color:#333;">${minPct.toFixed(1)}% ~ ${maxPct.toFixed(1)}%</div>
                                <div style="font-size:0.85em; color:#888; margin-top:5px;">( 깎이는 체력: ${minDmg} ~ ${maxDmg} )</div>
                            </div>
                        </div>

                        <!-- 우측: 방어측 -->
                        <div style="flex:1; min-width:320px; border:2px solid #4caf50; border-radius:12px; padding:15px; background:#f2fdf4; display:flex; flex-direction:column; gap:12px;">
                            <h3 style="color:#4caf50; margin:0; border-bottom:1px solid #c8e6c9; padding-bottom:8px;">🛡️ 방어 대상 (Defender)</h3>
                            
                            <div style="display:flex; gap:10px;">
                                <div style="flex:1; position:relative;">
                                    <input type="text" id="def-poke-search" placeholder="포켓몬 검색" value="${defPoke?.nameKo || ''}" style="width:100%; padding:6px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;" />
                                    <div id="def-poke-dropdown" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:150px; overflow-y:auto; background:#fff; border:1px solid #ccc; z-index:10; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                                </div>
                            </div>

                            <!-- 샘플 버튼 -->
                            <div style="display:flex; gap:5px;">
                                <button id="btn-def-phys" style="flex:1; font-size:0.8em; padding:4px; cursor:pointer;">물리막이 샘플</button>
                                <button id="btn-def-spec" style="flex:1; font-size:0.8em; padding:4px; cursor:pointer;">특수막이 샘플</button>
                                <button id="btn-def-none" style="flex:1; font-size:0.8em; padding:4px; cursor:pointer;">무보정 샘플</button>
                            </div>

                            <div style="background:#fff; padding:10px; border-radius:8px; border:1px solid #e8f5e9;">
                                <div style="margin-bottom:10px;">
                                    <span style="font-size:0.75em; color:#388e3c; font-weight:bold;">HP 실수값</span>
                                    <input type="number" id="hp-stat-val" value="${hpVal}" style="width:100%; padding:4px; box-sizing:border-box;" />
                                </div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div>
                                        <span style="font-size:0.75em; color:#fbc02d; font-weight:bold;">방어 실수값</span>
                                        <input type="number" id="def-stat-val" value="${defVal}" style="width:100%; padding:4px; box-sizing:border-box;" />
                                        <span style="font-size:0.75em; color:#666; margin-top:2px; display:block;">랭크업: <input type="number" id="def-rank" value="${defRank}" min="-6" max="6" style="width:40px;" /></span>
                                    </div>
                                    <div>
                                        <span style="font-size:0.75em; color:#4caf50; font-weight:bold;">특방 실수값</span>
                                        <input type="number" id="spd-stat-val" value="${spdVal}" style="width:100%; padding:4px; box-sizing:border-box;" />
                                        <span style="font-size:0.75em; color:#666; margin-top:2px; display:block;">랭크업: <input type="number" id="spd-rank" value="${spdRank}" min="-6" max="6" style="width:40px;" /></span>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="margin-top:10px;">
                                <div style="font-size:0.8em; color:#666;">물리 및 특수 내구력 (참고용)</div>
                                <div style="display:flex; justify-content:space-between; margin-top:5px;">
                                    <span style="font-weight:bold; color:#fbc02d;">물: ${(hpVal * defVal).toLocaleString()}</span>
                                    <span style="font-weight:bold; color:#4caf50;">특: ${(hpVal * spdVal).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            `;
            attachEvents();
        };

        const updateTypeMatchup = () => {
            if (defPoke && moveType) {
                let multi = 1.0;
                defPoke.types.forEach(t => {
                    if (TYPE_MATCHUPS[moveType as PokemonType] && TYPE_MATCHUPS[moveType as PokemonType][t as PokemonType] !== undefined) {
                        multi *= TYPE_MATCHUPS[moveType as PokemonType][t as PokemonType];
                    }
                });
                typeMulti = multi;
            }
        };

        const attachEvents = () => {
            const bindInput = (id: string, setter: (val: any) => void, isFloat = false) => {
                container.querySelector('#' + id)?.addEventListener('change', (e) => {
                    const target = e.target as HTMLInputElement;
                    setter(isFloat ? parseFloat(target.value) || 0 : parseInt(target.value) || 0);
                    renderUI();
                });
            };

            const bindSelect = (id: string, setter: (val: any) => void) => {
                container.querySelector('#' + id)?.addEventListener('change', (e) => {
                    setter((e.target as HTMLSelectElement).value);
                    if (id === 'move-type') updateTypeMatchup();
                    renderUI();
                });
            };

            // Values
            bindInput('atk-stat-val', v => atkStatVal = v);
            bindInput('spa-stat-val', v => spaStatVal = v);
            bindInput('atk-rank', v => atkRank = v);
            bindInput('spa-rank', v => spaRank = v);
            bindInput('move-power-val', v => movePower = v);
            bindInput('hp-stat-val', v => hpVal = v);
            bindInput('def-stat-val', v => defVal = v);
            bindInput('spd-stat-val', v => spdVal = v);
            bindInput('def-rank', v => defRank = v);
            bindInput('spd-rank', v => spdRank = v);
            bindInput('type-multi', v => typeMulti = v, true);
            
            // Selects
            bindSelect('move-type', v => moveType = v);
            bindSelect('move-category', v => moveCategory = v);
            bindSelect('stab-mod', v => stabMod = parseFloat(v));
            bindSelect('item-mod', v => itemMod = parseFloat(v));
            bindSelect('weather-select', v => weather = v);
            bindSelect('terrain-select', v => terrain = v);
            
            container.querySelector('#screen-check')?.addEventListener('change', (e) => {
                screenOn = (e.target as HTMLInputElement).checked;
                renderUI();
            });

            // Samples Events
            container.querySelector('#btn-atk-phys')?.addEventListener('click', () => {
                if(atkPoke) { atkStatVal = calcStat(atkPoke.stats.atk, true, true); spaStatVal = calcStat(atkPoke.stats.spa, false, false); renderUI(); }
                else alert('먼저 공격 포켓몬을 검색해주세요!');
            });
            container.querySelector('#btn-atk-spec')?.addEventListener('click', () => {
                if(atkPoke) { spaStatVal = calcStat(atkPoke.stats.spa, true, true); atkStatVal = calcStat(atkPoke.stats.atk, false, false); renderUI(); }
                else alert('먼저 공격 포켓몬을 검색해주세요!');
            });
            container.querySelector('#btn-def-phys')?.addEventListener('click', () => {
                if(defPoke) { hpVal = calcHp(defPoke.stats.hp, true); defVal = calcStat(defPoke.stats.def, true, true); spdVal = calcStat(defPoke.stats.spd, false, false); renderUI(); }
                else alert('먼저 방어 포켓몬을 검색해주세요!');
            });
            container.querySelector('#btn-def-spec')?.addEventListener('click', () => {
                if(defPoke) { hpVal = calcHp(defPoke.stats.hp, true); spdVal = calcStat(defPoke.stats.spd, true, true); defVal = calcStat(defPoke.stats.def, false, false); renderUI(); }
                else alert('먼저 방어 포켓몬을 검색해주세요!');
            });
            container.querySelector('#btn-def-none')?.addEventListener('click', () => {
                if(defPoke) { hpVal = calcHp(defPoke.stats.hp, false); defVal = calcStat(defPoke.stats.def, false, false); spdVal = calcStat(defPoke.stats.spd, false, false); renderUI(); }
                else alert('먼저 방어 포켓몬을 검색해주세요!');
            });

            // Searches
            const atkSearch = container.querySelector('#atk-poke-search') as HTMLInputElement;
            const atkDrop = container.querySelector('#atk-poke-dropdown') as HTMLDivElement;
            atkSearch?.addEventListener('input', () => {
                const term = atkSearch.value.toLowerCase();
                if (!term) { atkDrop.style.display = 'none'; return; }
                const matches = fullPokes.filter(p => p.nameKo.includes(term) || p.nameEn.toLowerCase().includes(term)).slice(0, 30);
                atkDrop.innerHTML = matches.map(m => `<div class="dropdown-item" data-id="${m.id}" style="padding:8px; cursor:pointer; border-bottom:1px solid #eee;">${m.nameKo}</div>`).join('');
                atkDrop.style.display = 'block';
            });
            atkDrop?.addEventListener('click', (e) => {
                const item = (e.target as HTMLElement).closest('.dropdown-item');
                if (item) {
                    const id = parseInt(item.getAttribute('data-id') || '0');
                    atkPoke = fullPokes.find(x => x.id === id) || null;
                    atkDrop.style.display = 'none';
                    if (atkPoke) {
                        // Default auto-fill to basic
                        atkStatVal = calcStat(atkPoke.stats.atk, true, true);
                        spaStatVal = calcStat(atkPoke.stats.spa, false, false);
                        if (selectedMove && atkPoke.types.includes(selectedMove.type as any)) stabMod = 1.5; else stabMod = 1.0;
                    }
                    renderUI();
                }
            });

            const defSearch = container.querySelector('#def-poke-search') as HTMLInputElement;
            const defDrop = container.querySelector('#def-poke-dropdown') as HTMLDivElement;
            defSearch?.addEventListener('input', () => {
                const term = defSearch.value.toLowerCase();
                if (!term) { defDrop.style.display = 'none'; return; }
                const matches = fullPokes.filter(p => p.nameKo.includes(term) || p.nameEn.toLowerCase().includes(term)).slice(0, 30);
                defDrop.innerHTML = matches.map(m => `<div class="dropdown-item" data-id="${m.id}" style="padding:8px; cursor:pointer; border-bottom:1px solid #eee;">${m.nameKo}</div>`).join('');
                defDrop.style.display = 'block';
            });
            defDrop?.addEventListener('click', (e) => {
                const item = (e.target as HTMLElement).closest('.dropdown-item');
                if (item) {
                    const id = parseInt(item.getAttribute('data-id') || '0');
                    defPoke = fullPokes.find(x => x.id === id) || null;
                    defDrop.style.display = 'none';
                    if (defPoke) {
                        hpVal = calcHp(defPoke.stats.hp, true);
                        defVal = calcStat(defPoke.stats.def, true, true);
                        spdVal = calcStat(defPoke.stats.spd, false, false);
                        updateTypeMatchup();
                    }
                    renderUI();
                }
            });

            const moveSearch = container.querySelector('#move-search') as HTMLInputElement;
            const moveDrop = container.querySelector('#move-dropdown') as HTMLDivElement;
            moveSearch?.addEventListener('input', () => {
                const term = moveSearch.value.toLowerCase();
                if (!term) { moveDrop.style.display = 'none'; return; }
                const matches = fullMoves.filter(m => m.power > 0 && (m.nameKo.includes(term) || m.nameEn.toLowerCase().includes(term))).slice(0, 30);
                moveDrop.innerHTML = matches.map(m => `<div class="dropdown-item" data-id="${m.id}" style="padding:8px; cursor:pointer; border-bottom:1px solid #eee;">${m.nameKo} <span style="font-size:0.8em; color:#888;">(위력: ${m.power})</span></div>`).join('');
                moveDrop.style.display = 'block';
            });
            moveDrop?.addEventListener('click', (e) => {
                const item = (e.target as HTMLElement).closest('.dropdown-item');
                if (item) {
                    const id = parseInt(item.getAttribute('data-id') || '0');
                    selectedMove = fullMoves.find(x => x.id === id) || null;
                    moveDrop.style.display = 'none';
                    if (selectedMove) {
                        movePower = selectedMove.power;
                        moveType = selectedMove.type;
                        if(selectedMove.category === 'physical' || selectedMove.category === 'special') moveCategory = selectedMove.category;
                        if (atkPoke && atkPoke.types.includes(selectedMove.type as any)) stabMod = 1.5; else stabMod = 1.0;
                        updateTypeMatchup();
                    }
                    renderUI();
                }
            });

            document.addEventListener('click', (e) => {
                if (!(e.target as HTMLElement).closest('#atk-poke-search') && !(e.target as HTMLElement).closest('#atk-poke-dropdown')) if(atkDrop) atkDrop.style.display = 'none';
                if (!(e.target as HTMLElement).closest('#def-poke-search') && !(e.target as HTMLElement).closest('#def-poke-dropdown')) if(defDrop) defDrop.style.display = 'none';
                if (!(e.target as HTMLElement).closest('#move-search') && !(e.target as HTMLElement).closest('#move-dropdown')) if(moveDrop) moveDrop.style.display = 'none';
            });
        };

        renderUI();

    } catch(err) {
        container.innerHTML = `<p style="color:red;">오류 발생: ${err}</p>`;
    }

    return () => {};
}
