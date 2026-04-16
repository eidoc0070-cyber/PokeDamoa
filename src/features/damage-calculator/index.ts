import { fetchPokedexData, fetchMovesData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO, TYPE_MATCHUPS, POKEMON_TYPES } from '../../data/constants.js';
import type { PokemonType } from '../../data/constants.js';
import { calculateStat, calculateBaseDamage, calculateDamageRolls, getRankMultiplier, getNatureMultiplier } from '../../utils/pokemon-math.js';
import { createAutocomplete } from '../../components/SearchAutocomplete.js';

export async function renderDamageCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="text-align:center; padding: 40px;"><p>데이터를 불러오는 중...</p></div>`;

    try {
        const [fullPokes, fullMoves] = await Promise.all([fetchPokedexData(), fetchMovesData()]);

        let atkPoke: PokemonData | null = null;
        let atkBase = { atk: 100, spa: 100 };
        let atkIv = { atk: 31, spa: 31 };
        let atkEv = { atk: 0, spa: 0 };
        let atkNature: Record<string, 'plus' | 'minus' | 'none'> = { atk: 'none', spa: 'none' };
        let atkStatVal = 100, spaStatVal = 100;
        let atkRank = 0, spaRank = 0;
        
        let selectedMove: MoveData | null = null;
        let movePower = 90, moveType = 'normal', moveCategory: 'physical' | 'special' = 'physical';
        
        let defPoke: PokemonData | null = null;
        let defBase = { hp: 100, def: 100, spd: 100 };
        let defIv = { hp: 31, def: 31, spd: 31 };
        let defEv = { hp: 0, def: 0, spd: 0 };
        let defNature: Record<string, 'plus' | 'minus' | 'none'> = { def: 'none', spd: 'none' };
        let hpVal = 100, defVal = 100, spdVal = 100;
        let defRank = 0, spdRank = 0;

        let level = 50, weather = 'none', terrain = 'none', screenOn = false;
        let stabMod = 1.0, typeMulti = 1.0, itemMod = 1.0;

        const updateAtkStats = () => {
            atkStatVal = calculateStat(atkBase.atk, atkIv.atk, atkEv.atk, level, false, getNatureMultiplier(atkNature.atk));
            spaStatVal = calculateStat(atkBase.spa, atkIv.spa, atkEv.spa, level, false, getNatureMultiplier(atkNature.spa));
        };

        const updateDefStats = () => {
            hpVal = calculateStat(defBase.hp, defIv.hp, defEv.hp, level, true);
            defVal = calculateStat(defBase.def, defIv.def, defEv.def, level, false, getNatureMultiplier(defNature.def));
            spdVal = calculateStat(defBase.spd, defIv.spd, defEv.spd, level, false, getNatureMultiplier(defNature.spd));
        };

        const calculateDamageRange = () => {
            let rawAtk = moveCategory === 'physical' ? atkStatVal : spaStatVal;
            let currentAtkRank = moveCategory === 'physical' ? atkRank : spaRank;
            let atk = Math.floor(rawAtk * getRankMultiplier(currentAtkRank));

            let rawDef = moveCategory === 'physical' ? defVal : spdVal;
            let currentDefRank = moveCategory === 'physical' ? defRank : spdRank;
            let def = Math.floor(rawDef * getRankMultiplier(currentDefRank));
            if (def < 1) def = 1;

            let baseDmg = calculateBaseDamage(level, movePower, atk, def);
            if (screenOn) baseDmg = Math.floor(baseDmg * 0.5);
            
            const rolls = calculateDamageRolls(baseDmg, stabMod, typeMulti, itemMod);
            const pcts = rolls.map(r => (r / hpVal) * 100);
            return { rolls, pcts };
        };

        const renderUI = () => {
            const { rolls, pcts } = calculateDamageRange();
            const minDmg = rolls[0], maxDmg = rolls[15];
            const minPct = pcts[0], maxPct = pcts[15];

            container.innerHTML = `
                <div style="max-width: 1000px; margin: 0 auto; display:flex; flex-direction:column; gap:20px;">
                    <h2 style="margin:0;">데미지 계산기 (리팩토링 버전)</h2>
                    
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap:20px;">
                        <!-- 공격자 패널 -->
                        <div style="border:2px solid #e53935; border-radius:12px; padding:15px; background:#fff;">
                            <h3 style="color:#e53935; margin-top:0;">⚔️ 공격자</h3>
                            <div id="atk-poke-search-container"></div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <label>레벨 <input type="number" id="level-input" value="${level}" style="width:50px;" /></label>
                            </div>
                            <div id="move-search-container"></div>
                            <div style="display:flex; gap:10px; font-size:0.9em; margin-top:10px;">
                                <label>공격실능: <strong>${atkStatVal}</strong></label>
                                <label>특공실능: <strong>${spaStatVal}</strong></label>
                            </div>
                        </div>

                        <!-- 방어자 패널 -->
                        <div style="border:2px solid #4caf50; border-radius:12px; padding:15px; background:#fff;">
                            <h3 style="color:#4caf50; margin-top:0;">🛡️ 방어자</h3>
                            <div id="def-poke-search-container"></div>
                            <div style="margin-top:10px;">
                                <p>HP실능: <strong>${hpVal}</strong></p>
                                <p>방어실능: <strong>${defVal}</strong> / 특방실능: <strong>${spdVal}</strong></p>
                            </div>
                        </div>
                    </div>

                    <!-- 결과 패널 -->
                    <div style="background:#f5f5f5; border-radius:12px; padding:20px; text-align:center; border:2px solid #333;">
                        <h3 style="margin:0;">계산 결과</h3>
                        <div style="font-size:2.5rem; font-weight:bold; margin:10px 0;">
                            ${minPct.toFixed(1)}% ~ ${maxPct.toFixed(1)}%
                        </div>
                        <p style="color:#666;">데미지량: ${minDmg} ~ ${maxDmg} / 전체 HP: ${hpVal}</p>
                    </div>
                </div>
            `;
            attachEvents();
        };

        const attachEvents = () => {
            createAutocomplete({
                container: container.querySelector('#atk-poke-search-container')!,
                label: '포켓몬 선택', placeholder: '이름 입력', data: fullPokes,
                initialValue: atkPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { 
                    atkPoke = p; atkBase = { atk: p.stats.atk, spa: p.stats.spa }; 
                    updateAtkStats(); renderUI(); 
                }
            });

            createAutocomplete({
                container: container.querySelector('#def-poke-search-container')!,
                label: '포켓몬 선택', placeholder: '이름 입력', data: fullPokes,
                initialValue: defPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { 
                    defPoke = p; defBase = { hp: p.stats.hp, def: p.stats.def, spd: p.stats.spd }; 
                    updateDefStats(); renderUI(); 
                }
            });

            createAutocomplete({
                container: container.querySelector('#move-search-container')!,
                label: '기술 선택', placeholder: '이름 입력', data: fullMoves.filter(m => m.power > 0),
                initialValue: selectedMove?.nameKo,
                getSearchKey: m => m.searchKey, getDisplayName: m => m.nameKo, getDisplaySub: m => `(위력 ${m.power})`,
                onSelect: m => { 
                    selectedMove = m; movePower = m.power; moveType = m.type; moveCategory = m.category as any;
                    if (atkPoke && atkPoke.types.includes(m.type as any)) stabMod = 1.5; else stabMod = 1.0;
                    renderUI(); 
                }
            });

            container.querySelector('#level-input')?.addEventListener('change', (e) => {
                level = parseInt((e.target as HTMLInputElement).value) || 50;
                updateAtkStats(); updateDefStats(); renderUI();
            });
        };

        updateAtkStats(); updateDefStats(); renderUI();
    } catch(err) {
        container.innerHTML = `<p style="color:red;">오류: ${err}</p>`;
    }
    return () => {};
}
