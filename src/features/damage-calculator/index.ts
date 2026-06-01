import { fetchPokedexData, fetchMovesData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO, TYPE_MATCHUPS, POKEMON_TYPES, NATURES } from '../../data/constants.js';
import type { PokemonType, StatKey } from '../../data/constants.js';
import { calculateStat, calculateBaseDamage, calculateDamageRolls, getRankMultiplier, getStatsForGen, getTypesForGen, getSortedMovesForPoke, getMoveItemStyle, renderMoveItemExtra } from '../../utils/pokemon-math.js';
import { createAutocomplete } from '../../components/SearchAutocomplete.js';
import { globalStore } from '../../state/store.js';
import { renderAccordion } from '../../components/Accordion.js'; // 모듈화된 아코디언 적용
import { openPartySelectorModal } from '../party-builder/sub-components/PartySelectorModal.js';

export async function renderDamageCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="text-align:center; padding: 40px;"><p>데이터를 불러오는 중...</p></div>`;

    try {
        const [fullPokes, fullMoves] = await Promise.all([fetchPokedexData(), fetchMovesData()]);

        let atkPoke: PokemonData | null = null;
        let atkStatVal = 100, spaStatVal = 100;
        let atkRank = 0, spaRank = 0;
        let atkEvs = { hp: 0, atk: 252, def: 0, spa: 252, spd: 0, spe: 0 };
        let atkIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        let atkNatureId = 0;
        
        let selectedMove: MoveData | null = null;
        let movePower = 0, moveType = 'normal', moveCategory: 'physical' | 'special' = 'physical';
        
        let defPoke: PokemonData | null = null;
        let hpVal = 100, defVal = 100, spdVal = 100;
        let defRank = 0, spdRank = 0;
        let defEvs = { hp: 252, atk: 0, def: 252, spa: 0, spd: 252, spe: 0 };
        let defIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        let defNatureId = 0;

        let level = 50, screenOn = false;
        let stabMod = 1.0, typeMulti = 1.0, itemMod = 1.0;
        
        // 아코디언 상태 관리
        let isAtkPanelOpen = true;
        let isDefPanelOpen = false; // 기본적으로 방어자는 접어둠

        const getSortedMoves = (poke: PokemonData | null) => {
            const currentGen = globalStore.getState().generation;
            const targetGen = currentGen === 'champions' ? 9 : currentGen as number;
            return getSortedMovesForPoke(fullMoves, poke, targetGen, m => m.power > 0);
        };

        const updateAtkStats = () => {
            if (!atkPoke) return;
            const currentGen = globalStore.getState().generation;
            const targetGen = currentGen === 'champions' ? 9 : currentGen as number;
            const stats = getStatsForGen(atkPoke, targetGen);
            const nature = NATURES.find(n => n.id === atkNatureId);
            
            const getMod = (key: StatKey) => {
                if (nature?.plus === key) return 1.1;
                if (nature?.minus === key) return 0.9;
                return 1.0;
            };

            atkStatVal = calculateStat(stats.atk, atkIvs.atk, atkEvs.atk, level, false, getMod('atk'));
            spaStatVal = calculateStat(stats.spa, atkIvs.spa, atkEvs.spa, level, false, getMod('spa'));
        };

        const updateDefStats = () => {
            if (!defPoke) return;
            const currentGen = globalStore.getState().generation;
            const targetGen = currentGen === 'champions' ? 9 : currentGen as number;
            const stats = getStatsForGen(defPoke, targetGen);
            const nature = NATURES.find(n => n.id === defNatureId);

            const getMod = (key: StatKey) => {
                if (nature?.plus === key) return 1.1;
                if (nature?.minus === key) return 0.9;
                return 1.0;
            };

            hpVal = calculateStat(stats.hp, defIvs.hp, defEvs.hp, level, true);
            defVal = calculateStat(stats.def, defIvs.def, defEvs.def, level, false, getMod('def'));
            spdVal = calculateStat(stats.spd, defIvs.spd, defEvs.spd, level, false, getMod('spd'));
        };

        const updateModifiers = () => {
            const currentGen = globalStore.getState().generation;
            const targetGen = currentGen === 'champions' ? 9 : currentGen as number;

            if (selectedMove && atkPoke) {
                const types = getTypesForGen(atkPoke, targetGen);
                stabMod = types.includes(selectedMove.type as any) ? 1.5 : 1.0;
            } else {
                stabMod = 1.0;
            }

            if (selectedMove && defPoke) {
                const dTypes = getTypesForGen(defPoke, targetGen);
                typeMulti = 1.0;
                for (const dt of dTypes) {
                    const genMatchups = TYPE_MATCHUPS;
                    const typeMatchup = genMatchups[selectedMove.type as PokemonType];
                    if (typeMatchup && typeMatchup[dt as PokemonType] !== undefined) {
                        typeMulti *= typeMatchup[dt as PokemonType]!;
                    }
                }
            } else {
                typeMulti = 1.0;
            }
        };

        const calculateDamageRange = () => {
            updateModifiers();
            if (!selectedMove) return { rolls: [0], pcts: [0] };
            
            let rawAtk = moveCategory === 'physical' ? atkStatVal : spaStatVal;
            let atk = Math.floor(rawAtk * getRankMultiplier(moveCategory === 'physical' ? atkRank : spaRank));

            let rawDef = moveCategory === 'physical' ? defVal : spdVal;
            let def = Math.floor(rawDef * getRankMultiplier(moveCategory === 'physical' ? defRank : spdRank));
            if (def < 1) def = 1;

            let baseDmg = calculateBaseDamage(level, movePower, atk, def);
            if (screenOn) baseDmg = Math.floor(baseDmg * 0.5);
            
            const rolls = calculateDamageRolls(baseDmg, stabMod, typeMulti, itemMod);
            const pcts = rolls.map(r => (r / hpVal) * 100);
            return { rolls, pcts };
        };

        const renderUI = () => {
            const { rolls, pcts } = calculateDamageRange();
            const minDmg = rolls[0]!, maxDmg = rolls[rolls.length - 1]!;
            const minPct = pcts[0]!, maxPct = pcts[pcts.length - 1]!;
            const currentGen = globalStore.getState().generation;

            const atkContent = `
                <div style="display:flex; gap:8px; align-items:flex-end;">
                    <div id="atk-poke-search-container" style="flex:1;"></div>
                    <button id="btn-load-atk-party" class="btn" style="padding:8px; font-size:0.8rem; background:#f3e5f5; color:#7b1fa2; border-color:#e1bee7; margin-bottom:0; height:38px;">🏟️</button>
                </div>
                <div id="move-search-container" style="margin-top:15px;"></div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; background:rgba(0,0,0,0.02); padding:15px; border-radius:8px; border:1px solid #f0f0f0;">
                    <label style="font-weight:bold; display:flex; align-items:center; gap:8px;">
                        레벨 <input type="number" id="level-input" class="form-control" value="${level}" style="width:60px; padding:6px; text-align:center;" />
                    </label>
                    <div style="display:flex; flex-direction:column; text-align:right;">
                        <span style="font-size:0.85rem; color:var(--text-muted);">실능치(보정보정)</span>
                        <span style="font-size:0.95rem;">공: <strong>${atkStatVal}</strong> | 특공: <strong>${spaStatVal}</strong></span>
                    </div>
                </div>
            `;

            const defContent = `
                <div style="display:flex; gap:8px; align-items:flex-end;">
                    <div id="def-poke-search-container" style="flex:1;"></div>
                    <button id="btn-load-def-party" class="btn" style="padding:8px; font-size:0.8rem; background:#f3e5f5; color:#7b1fa2; border-color:#e1bee7; margin-bottom:0; height:38px;">🏟️</button>
                </div>
                <div style="margin-top:15px; background:rgba(0,0,0,0.02); padding:15px; border-radius:8px; border:1px solid #f0f0f0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span style="font-weight:bold; color:var(--text-color);">HP 실능 (보정보정)</span>
                        <strong style="color:#d32f2f; font-size:1.1rem;">${hpVal}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-muted);">
                        <span>방어: <strong>${defVal}</strong></span>
                        <span>특수방어: <strong>${spdVal}</strong></span>
                    </div>
                </div>
            `;

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <h2 style="margin:0; font-size:1.3rem;">데미지 계산기</h2>
                        <span style="background:var(--primary-color); color:#fff; padding:4px 12px; border-radius:20px; font-weight:bold; font-size:0.8rem;">
                            ${currentGen === 'champions' ? 'Champions' : currentGen + '세대'}
                        </span>
                    </div>
                    
                    <!-- 아코디언 컴포넌트를 사용한 공격자/방어자 패널 -->
                    ${renderAccordion({ id: 'atk', title: '공격자 (Attacker)', icon: '⚔️', contentHtml: atkContent, isOpen: isAtkPanelOpen, borderColor: '#e53935' })}
                    ${renderAccordion({ id: 'def', title: '방어자 (Defender)', icon: '🛡️', contentHtml: defContent, isOpen: isDefPanelOpen, borderColor: '#4caf50' })}

                    <!-- 결과 패널 -->
                    <div class="card" style="text-align:center; border:2px solid #333; margin-top:10px;">
                        <h3 style="margin:0; color:var(--text-color);">계산 결과</h3>
                        <div style="font-size:2.8rem; font-weight:900; margin:15px 0; color: ${maxPct >= 100 ? '#d32f2f' : '#1976d2'}; text-shadow: 1px 1px 0px rgba(0,0,0,0.1);">
                            ${minPct.toFixed(1)}% <span style="font-size:1.5rem; color:#888;">~</span> ${maxPct.toFixed(1)}%
                        </div>
                        
                        <div style="background:rgba(0,0,0,0.03); padding:12px; border-radius:8px; margin-bottom:15px;">
                            <span style="color:var(--text-muted); font-size:0.9rem; display:block; margin-bottom:4px;">실제 데미지량 / 상대방 총 HP</span>
                            <strong style="font-size:1.2rem;">${minDmg} ~ ${maxDmg} <span style="color:#888; font-weight:normal;">/</span> ${hpVal}</strong>
                        </div>
                        
                        <div style="font-size:0.9rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:8px; background:#f5f5f5; padding:6px 12px; border-radius:20px; border:1px solid #ddd;">
                            ${selectedMove ? `<strong>${selectedMove.nameKo}</strong> (위력 ${movePower}) <span style="display:inline-block; width:12px; height:12px; background:${TYPE_COLORS[selectedMove.type as PokemonType]}; border-radius:50%;"></span> ${TYPE_NAMES_KO[selectedMove.type as PokemonType]}` : '기술을 선택해주세요.'}
                        </div>
                    </div>
                </div>
            `;
            attachEvents();
        };

        let moveAutocomplete: any = null;

        const attachEvents = () => {
            const currentGen = globalStore.getState().generation;
            const targetGen = currentGen === 'champions' ? 9 : currentGen as number;

            // 아코디언 상태 동기화 이벤트
            container.querySelector('.accordion-header')?.parentElement?.addEventListener('click', (e) => {
                const header = (e.target as HTMLElement).closest('.accordion-header');
                if (header) {
                    const id = header.parentElement?.querySelector('.accordion-content')?.id;
                    if (id === 'atk-content') isAtkPanelOpen = !isAtkPanelOpen;
                    if (id === 'def-content') isDefPanelOpen = !isDefPanelOpen;
                }
            });

            container.querySelector('#btn-load-atk-party')?.addEventListener('click', () => {
                openPartySelectorModal((slot) => {
                    const p = fullPokes.find(p => p.id === slot.pokemonId);
                    if (p) {
                        atkPoke = p;
                        atkEvs = { ...slot.evs };
                        atkIvs = { ...slot.ivs };
                        atkNatureId = slot.natureId;
                        level = slot.level;
                        updateAtkStats();
                        updateDefStats(); // Level might have changed
                        if (moveAutocomplete) {
                            moveAutocomplete.setData(getSortedMoves(p));
                        }
                        renderUI();
                    }
                });
            });

            container.querySelector('#btn-load-def-party')?.addEventListener('click', () => {
                openPartySelectorModal((slot) => {
                    const p = fullPokes.find(p => p.id === slot.pokemonId);
                    if (p) {
                        defPoke = p;
                        defEvs = { ...slot.evs };
                        defIvs = { ...slot.ivs };
                        defNatureId = slot.natureId;
                        level = slot.level;
                        updateAtkStats(); // Level might have changed
                        updateDefStats();
                        renderUI();
                    }
                });
            });

            createAutocomplete({
                container: container.querySelector('#atk-poke-search-container')!,
                label: '공격자 포켓몬', placeholder: '이름 입력', data: fullPokes.filter(p => p.genId <= targetGen),
                initialValue: atkPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { 
                    atkPoke = p; 
                    atkEvs = { hp: 0, atk: 252, def: 0, spa: 252, spd: 0, spe: 0 };
                    atkIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
                    atkNatureId = 0;
                    updateAtkStats(); 
                    if (moveAutocomplete) {
                        const currentGen = globalStore.getState().generation;
                        const targetGen = currentGen === 'champions' ? 9 : currentGen as number;
                        moveAutocomplete.setData(getSortedMoves(p));
                        moveAutocomplete.setOptions({ 
                            getItemStyle: (m: MoveData) => getMoveItemStyle(m, atkPoke, targetGen),
                            renderItemExtra: (m: MoveData) => renderMoveItemExtra(m, atkPoke, targetGen, TYPE_COLORS)
                        });                    }
                    renderUI(); 
                }
            });

            createAutocomplete({
                container: container.querySelector('#def-poke-search-container')!,
                label: '방어자 포켓몬', placeholder: '이름 입력', data: fullPokes.filter(p => p.genId <= targetGen),
                initialValue: defPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { 
                    defPoke = p; 
                    defEvs = { hp: 252, atk: 0, def: 252, spa: 0, spd: 252, spe: 0 };
                    defIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
                    defNatureId = 0;
                    updateDefStats(); 
                    renderUI(); 
                }
            });

            moveAutocomplete = createAutocomplete({
                container: container.querySelector('#move-search-container')!,
                label: '기술 선택', placeholder: '이름 입력', data: getSortedMoves(atkPoke),
                initialValue: selectedMove?.nameKo,
                getSearchKey: m => m.searchKey, 
                getDisplayName: m => m.nameKo, 
                getDisplaySub: m => `(위력 ${m.power || '-'}, ${TYPE_NAMES_KO[m.type as PokemonType]})`,
                getItemStyle: m => getMoveItemStyle(m, atkPoke, targetGen),
                renderItemExtra: m => renderMoveItemExtra(m, atkPoke, targetGen, TYPE_COLORS),
                onSelect: m => { 
                    selectedMove = m; movePower = m.power || 0; moveType = m.type; moveCategory = m.category as any;
                    renderUI(); 
                }
            });

            container.querySelector('#level-input')?.addEventListener('change', (e) => {
                level = parseInt((e.target as HTMLInputElement).value) || 50;
                updateAtkStats(); updateDefStats(); renderUI();
            });
        };

        const unsubscribe = globalStore.subscribe(() => {
            updateAtkStats();
            updateDefStats();
            if (moveAutocomplete) {
                const currentGen = globalStore.getState().generation;
                const targetGen = currentGen === 'champions' ? 9 : currentGen as number;
                moveAutocomplete.setData(getSortedMoves(atkPoke));
                moveAutocomplete.setOptions({ 
                    getItemStyle: (m: MoveData) => getMoveItemStyle(m, atkPoke, targetGen),
                    renderItemExtra: (m: MoveData) => renderMoveItemExtra(m, atkPoke, targetGen, TYPE_COLORS)
                });            }
            renderUI();
        });

        updateAtkStats(); updateDefStats(); renderUI();
        return unsubscribe;

    } catch(err) {
        container.innerHTML = `<p style="color:red;">오류: ${err}</p>`;
        return () => {};
    }
}
