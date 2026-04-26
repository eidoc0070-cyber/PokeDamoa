import { fetchPokedexData, fetchMovesData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { calculateStat, calculateBulk, calculatePower, getStatsForGen, getTypesForGen, getSortedMovesForPoke, getMoveItemStyle, renderMoveItemExtra } from '../../utils/pokemon-math.js';
import { createAutocomplete } from '../../components/SearchAutocomplete.js';
import { renderStatInputCard } from '../../components/StatInputCard.js'; // 모듈화된 카드 UI
import { globalStore } from '../../state/store.js';

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
type StatKey = typeof STAT_KEYS[number];

const STAT_NAMES: Record<StatKey, string> = {
    hp: 'HP', atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드'
};

const STAT_COLORS: Record<StatKey, string> = {
    hp: '#e53935', atk: '#f57c00', def: '#fbc02d', spa: '#1e88e5', spd: '#4caf50', spe: '#e91e63'
};

// PokeAPI Generation IDs mapping
const GEN_ID_MAP: Record<number | string, number> = {
    1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 11, 9: 18, 'champions': 18
};

export async function renderStatCalculator(container: HTMLElement): Promise<() => void> {
    container.innerHTML = `<div style="text-align:center; padding: 40px;"><p>데이터를 불러오는 중...</p></div>`;

    try {
        const [fullData, movesData] = await Promise.all([fetchPokedexData(), fetchMovesData()]);
        
        let selectedPoke: PokemonData | null = fullData.find(p => p.id === 445) || fullData[0];
        let selectedMove: MoveData | null = null;
        let baseStats: Record<StatKey, number> = selectedPoke ? { ...selectedPoke.stats as any } : { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        let level = 50;
        let ivs: Record<StatKey, number> = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        let evs: Record<StatKey, number> = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        let naturePlus: StatKey | 'none' = 'none';
        let natureMinus: StatKey | 'none' = 'none';

        let moveAutocomplete: any = null;

        const getSortedMoves = () => {
            const gen = globalStore.getState().generation;
            const targetGen = gen === 'champions' ? 9 : gen as number;
            return getSortedMovesForPoke(movesData, selectedPoke, targetGen, m => m.category !== 'status');
        };

        const calcStat = (key: StatKey) => {
            const base = baseStats[key];
            const iv = ivs[key];
            const ev = evs[key];
            let natureMod = 1.0;
            if (key !== 'hp') {
                if (naturePlus === key && natureMinus !== key) natureMod = 1.1;
                if (natureMinus === key && naturePlus !== key) natureMod = 0.9;
            }
            return calculateStat(base, iv, ev, level, key === 'hp', natureMod);
        };

        const renderStructure = () => {
            const evTotal = Object.values(evs).reduce((a, b) => a + b, 0);
            const hpReal = calcStat('hp');
            const atkReal = calcStat('atk');
            const defReal = calcStat('def');
            const spaReal = calcStat('spa');
            const spdReal = calcStat('spd');
            const physBulk = calculateBulk(hpReal, defReal);
            const specBulk = calculateBulk(hpReal, spdReal);

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px; padding: 5px;">
                    <div class="card" style="margin-bottom:0; padding:12px;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                            <div id="poke-autocomplete-container" style="flex:1;"></div>
                            <div id="poke-sprite-container"></div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:12px;">
                            <label style="font-size:0.8rem; font-weight:bold; display:flex; align-items:center; gap:4px;">
                                Lv <input type="number" id="level-input" class="form-control" value="${level}" min="1" max="100" style="width: 45px; text-align:center; padding:4px 0;" />
                            </label>
                            
                            <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; margin: 0 4px;">
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
                                    <button class="btn-preset" data-preset="phys-atk" style="padding: 6px 0; font-size: 0.7rem; font-weight:bold; background:#fff5f0; color:#e65100; border:1px solid #ffccbc; border-radius:6px; cursor:pointer;">물공 극보</button>
                                    <button class="btn-preset" data-preset="spec-atk" style="padding: 6px 0; font-size: 0.7rem; font-weight:bold; background:#e3f2fd; color:#1565c0; border:1px solid #bbdefb; border-radius:6px; cursor:pointer;">특공 극보</button>
                                    <button class="btn-preset" data-preset="phys-def" style="padding: 6px 0; font-size: 0.7rem; font-weight:bold; background:#fffde7; color:#f9a825; border:1px solid #fff9c4; border-radius:6px; cursor:pointer;">물방 극보</button>
                                    <button class="btn-preset" data-preset="spec-def" style="padding: 6px 0; font-size: 0.7rem; font-weight:bold; background:#f1f8e9; color:#2e7d32; border:1px solid #dcedc8; border-radius:6px; cursor:pointer;">특방 극보</button>
                                </div>
                                <button id="btn-reset" style="padding: 6px 0; font-size: 0.7rem; font-weight:bold; background:#f5f5f5; color:#616161; border:1px solid #e0e0e0; border-radius:6px; cursor:pointer;">초기화</button>
                            </div>

                            <button id="btn-nature-table" class="btn" style="padding:8px 6px; font-size:0.75rem; color:var(--primary-color); border-color:var(--primary-color); min-width:65px;">📋 성격표</button>
                        </div>

                        <div id="move-autocomplete-container" style="margin-bottom:12px;"></div>

                        <div style="background:rgba(0,0,0,0.04); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:10px; border:1px solid rgba(0,0,0,0.05);">
                            <div style="text-align:center;">
                                <div style="font-size:0.75rem; color:#666; margin-bottom:2px; font-weight:bold;">결정력</div>
                                <div id="power-val" style="font-size:1.8rem; font-weight:900; color:#f57c00; line-height:1.2;">0</div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; border-top:1px solid rgba(0,0,0,0.1); padding-top:10px;">
                                <div style="text-align:center;">
                                    <div style="font-size:0.7rem; color:#666; margin-bottom:2px;">물리내구</div>
                                    <div id="phys-bulk" style="font-size:1.1rem; font-weight:bold; color:var(--text-color);">${physBulk.toLocaleString()}</div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:0.7rem; color:#666; margin-bottom:2px;">특수내구</div>
                                    <div id="spec-bulk" style="font-size:1.1rem; font-weight:bold; color:var(--text-color);">${specBulk.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:0 5px;">
                            <h3 style="margin:0; font-size:1rem; color:var(--text-color);">능력치 세팅</h3>
                            <span id="ev-total-display" style="font-size:0.8rem; font-weight:bold; padding:2px 10px; border-radius:15px; background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9;">노력치: ${evTotal}/510</span>
                        </div>
                        
                        <div id="stat-cards-container" style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            ${STAT_KEYS.map(key => renderStatInputCard({
                                statKey: key, statName: STAT_NAMES[key], statColor: STAT_COLORS[key],
                                base: baseStats[key], iv: ivs[key], ev: evs[key],
                                naturePlus: naturePlus === key, natureMinus: natureMinus === key,
                                realVal: calcStat(key)
                            })).join('')}
                        </div>
                    </div>
                </div>

                <div id="nature-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
                    <div style="background:var(--surface-color); width:90%; max-width:400px; border-radius:16px; padding:25px; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                        <button id="modal-close" style="position:absolute; top:15px; right:15px; border:none; background:rgba(0,0,0,0.05); width:30px; height:30px; border-radius:50%; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
                        <h3 style="margin-top:0; color:var(--text-color);">성격 보정표</h3>
                        <div style="overflow:hidden; border-radius:8px; border:1px solid var(--border-color);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.9rem; text-align:center;">
                                <tr style="background:rgba(0,0,0,0.05); border-bottom:1px solid var(--border-color);"><th style="padding:10px;">성격</th><th style="padding:10px; color:#d32f2f;">증가(+)</th><th style="padding:10px; color:#1976d2;">감소(-)</th></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">고집</td><td style="color:#d32f2f;">공격</td><td style="color:#1976d2;">특공</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">명랑</td><td style="color:#d32f2f;">스피드</td><td style="color:#1976d2;">특공</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">겁쟁이</td><td style="color:#d32f2f;">스피드</td><td style="color:#1976d2;">공격</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">조심</td><td style="color:#d32f2f;">특공</td><td style="color:#1976d2;">공격</td></tr>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            attachEvents();
            updateValues();
        };

        const updateValues = () => {
            const evTotal = Object.values(evs).reduce((a, b) => a + b, 0);
            const hpReal = calcStat('hp');
            const atkReal = calcStat('atk');
            const defReal = calcStat('def');
            const spaReal = calcStat('spa');
            const spdReal = calcStat('spd');
            const speReal = calcStat('spe');
            const physBulk = calculateBulk(hpReal, defReal);
            const specBulk = calculateBulk(hpReal, spdReal);

            let powerVal = 0;
            if (selectedMove && selectedPoke) {
                const stab = selectedPoke.types.includes(selectedMove.type) ? 1.5 : 1.0;
                const statUsed = selectedMove.category === 'special' ? spaReal : atkReal;
                powerVal = calculatePower(statUsed, selectedMove.power, stab);
            }

            // 대시보드 업데이트
            container.querySelector('#power-val')!.textContent = powerVal.toLocaleString();
            container.querySelector('#phys-bulk')!.textContent = physBulk.toLocaleString();
            container.querySelector('#spec-bulk')!.textContent = specBulk.toLocaleString();
            
            const evDisplay = container.querySelector('#ev-total-display') as HTMLElement;
            evDisplay.textContent = `노력치: ${evTotal}/510`;
            evDisplay.style.background = evTotal > 510 ? '#ffebee' : '#e8f5e9';
            evDisplay.style.color = evTotal > 510 ? '#d32f2f' : '#2e7d32';

            // 각 카드 실수값 업데이트 및 입력 필드 동기화
            STAT_KEYS.forEach(key => {
                const realVal = key === 'hp' ? hpReal : (key === 'atk' ? atkReal : (key === 'def' ? defReal : (key === 'spa' ? spaReal : (key === 'spd' ? spdReal : (key === 'spe' ? speReal : 0)))));
                const card = container.querySelector(`.stat-card[style*="${STAT_COLORS[key]}"]`);
                if (card) {
                    card.querySelector('span[style*="font-size:1.3rem"]')!.textContent = realVal.toString();
                    (card.querySelector('.base-stat-input') as HTMLInputElement).value = baseStats[key].toString();
                    (card.querySelector('.iv-input') as HTMLInputElement).value = ivs[key].toString();
                    (card.querySelector('.ev-input') as HTMLInputElement).value = evs[key].toString();
                    if (key !== 'hp') {
                        (card.querySelector(`input[name="nature-plus"][value="${key}"]`) as HTMLInputElement).checked = naturePlus === key;
                        (card.querySelector(`input[name="nature-minus"][value="${key}"]`) as HTMLInputElement).checked = natureMinus === key;
                    }
                }
            });

            // 포켓몬 스프라이트 업데이트
            const spriteContainer = container.querySelector('#poke-sprite-container')!;
            if (selectedPoke) {
                spriteContainer.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPoke.id}.png" style="width:52px; height:52px; image-rendering:pixelated; background:#f5f5f5; border-radius:8px; border:1px solid #eee;" />
                        <div style="display:flex; gap:2px;">
                            ${selectedPoke.types.map(t => `<span style="padding: 1px 4px; background: ${TYPE_COLORS[t]}; color:#fff; border-radius:4px; font-size:0.6rem;">${TYPE_NAMES_KO[t]}</span>`).join('')}
                        </div>
                    </div>
                `;
            } else {
                spriteContainer.innerHTML = '';
            }
        };

        const attachEvents = () => {
            createAutocomplete({
                container: container.querySelector('#poke-autocomplete-container')!,
                label: '포켓몬 검색', placeholder: '이름 입력', data: fullData,
                initialValue: selectedPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { 
                    selectedPoke = p; 
                    const gen = globalStore.getState().generation;
                    const targetGen = gen === 'champions' ? 9 : gen as number;
                    baseStats = { ...getStatsForGen(p, targetGen) as any }; 
                    if (moveAutocomplete) {
                        moveAutocomplete.setData(getSortedMoves());
                        moveAutocomplete.setOptions({
                            getItemStyle: m => getMoveItemStyle(m, selectedPoke, targetGen),
                            renderItemExtra: m => renderMoveItemExtra(m, selectedPoke, targetGen, TYPE_COLORS)
                        });
                    }
                    updateValues(); 
                }
            });

            const gen = globalStore.getState().generation;
            const targetGen = gen === 'champions' ? 9 : gen as number;
            moveAutocomplete = createAutocomplete({
                container: container.querySelector('#move-autocomplete-container')!,
                label: '기술 검색', placeholder: '이름 입력', 
                data: getSortedMoves(),
                initialValue: selectedMove?.nameKo,
                getSearchKey: m => m.searchKey, getDisplayName: m => m.nameKo, getDisplaySub: m => `(위력 ${m.power})`,
                onSelect: m => { selectedMove = m; updateValues(); },
                getItemStyle: m => getMoveItemStyle(m, selectedPoke, targetGen),
                renderItemExtra: m => renderMoveItemExtra(m, selectedPoke, targetGen, TYPE_COLORS)
            });

            container.querySelector('#level-input')?.addEventListener('input', (e) => {
                level = parseInt((e.target as HTMLInputElement).value) || 0; updateValues();
            });

            container.querySelectorAll('.btn-preset').forEach(el => el.addEventListener('click', (e) => {
                const preset = (e.currentTarget as HTMLElement).getAttribute('data-preset');
                if (preset === 'phys-atk') { evs.atk = 252; naturePlus = 'atk'; natureMinus = 'spa'; }
                else if (preset === 'spec-atk') { evs.spa = 252; naturePlus = 'spa'; natureMinus = 'atk'; }
                else if (preset === 'phys-def') { evs.def = 252; naturePlus = 'def'; natureMinus = 'spa'; }
                else if (preset === 'spec-def') { evs.spd = 252; naturePlus = 'spd'; natureMinus = 'atk'; }
                updateValues();
            }));

            container.querySelector('#btn-reset')?.addEventListener('click', () => {
                evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
                ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
                naturePlus = 'none'; natureMinus = 'none';
                updateValues();
            });

            container.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                const stat = target.getAttribute('data-stat') as StatKey;
                if (!stat) return;

                if (target.classList.contains('base-stat-input')) baseStats[stat] = parseInt(target.value) || 0;
                else if (target.classList.contains('iv-input')) ivs[stat] = parseInt(target.value) || 0;
                else if (target.classList.contains('ev-input')) evs[stat] = parseInt(target.value) || 0;
                
                updateValues();
            });

            container.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                if (target.name === 'nature-plus') { naturePlus = target.value as StatKey; updateValues(); }
                else if (target.name === 'nature-minus') { natureMinus = target.value as StatKey; updateValues(); }
            });

            container.querySelector('#btn-nature-table')?.addEventListener('click', () => container.querySelector<HTMLElement>('#nature-modal')!.style.display = 'flex');
            container.querySelector('#modal-close')?.addEventListener('click', () => container.querySelector<HTMLElement>('#nature-modal')!.style.display = 'none');
        };

        const unsubscribe = globalStore.subscribe(() => {
            if (moveAutocomplete) {
                const gen = globalStore.getState().generation;
                const targetGen = gen === 'champions' ? 9 : gen as number;
                moveAutocomplete.setData(getSortedMoves());
                moveAutocomplete.setOptions({
                    getItemStyle: m => getMoveItemStyle(m, selectedPoke, targetGen),
                    renderItemExtra: m => renderMoveItemExtra(m, selectedPoke, targetGen, TYPE_COLORS)
                });
            }
        });

        renderStructure();
        
        return () => {
            unsubscribe();
        };
    } catch (err) {
        container.innerHTML = `<div class="card"><p style="color:red; text-align:center;">오류: ${err}</p></div>`;
    }
    return () => {};
}
