import { fetchPokedexData, fetchMovesData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { calculateStat, calculateBulk, calculatePower } from '../../utils/pokemon-math.js';
import { createAutocomplete } from '../../components/SearchAutocomplete.js';

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
type StatKey = typeof STAT_KEYS[number];

const STAT_NAMES: Record<StatKey, string> = {
    hp: 'HP', atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드'
};

const STAT_COLORS: Record<StatKey, string> = {
    hp: '#e53935', atk: '#f57c00', def: '#fbc02d', spa: '#1e88e5', spd: '#4caf50', spe: '#e91e63'
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

        const renderUI = () => {
            const evTotal = Object.values(evs).reduce((a, b) => a + b, 0);
            const hpReal = calcStat('hp');
            const atkReal = calcStat('atk');
            const defReal = calcStat('def');
            const spaReal = calcStat('spa');
            const spdReal = calcStat('spd');
            const physBulk = calculateBulk(hpReal, defReal);
            const specBulk = calculateBulk(hpReal, spdReal);
            let powerVal = 0;
            if (selectedMove && selectedPoke) {
                const stab = selectedPoke.types.includes(selectedMove.type) ? 1.5 : 1.0;
                const statUsed = selectedMove.category === 'special' ? spaReal : atkReal;
                powerVal = calculatePower(statUsed, selectedMove.power, stab);
            }

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
                        <div style="flex:1; min-width:300px;">
                            <h2 style="margin-top:0;">실수값(실능) 계산기</h2>
                            <div id="poke-autocomplete-container"></div>
                            <label style="font-weight:bold; display:block; margin-bottom:10px;">
                                레벨 (Level) : <input type="number" id="level-input" value="${level}" min="1" max="100" style="width: 60px; padding: 5px; font-size: 1.1rem;" />
                            </label>
                            <button id="btn-nature-table" style="padding: 8px 15px; background: #673ab7; color: #fff; border:none; border-radius: 6px; cursor:pointer; font-weight:bold;">📋 성격 표 보기</button>
                        </div>
                        ${selectedPoke ? `
                        <div style="background:rgba(0,0,0,0.05); border-radius: 12px; padding: 20px; text-align:center; min-width: 180px;">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPoke.id}.png" style="width:96px; height:96px; image-rendering:pixelated; background:#fff; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.1); display:block; margin: 0 auto 10px;" />
                            <h3 style="margin:0;">${selectedPoke.nameKo}</h3>
                            <div style="margin-top:5px;">
                                ${selectedPoke.types.map(t => `<span style="display:inline-block; padding: 3px 8px; background: ${TYPE_COLORS[t]}; color:#fff; border-radius:4px; font-size:0.8em; margin:2px;">${TYPE_NAMES_KO[t]}</span>`).join('')}
                            </div>
                        </div>` : ''}
                    </div>

                    <div style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h3 style="margin:0;">능력치 조절</h3>
                            <span style="font-size:0.9em; font-weight:bold; color: ${evTotal > 510 ? 'red' : '#333'};">노력치: ${evTotal}/510</span>
                        </div>
                        <div style="overflow-x:auto;">
                            <table style="width:100%; border-collapse: collapse; text-align:center;">
                                <thead>
                                    <tr style="background:#f5f5f5; border-bottom: 2px solid #ddd;">
                                        <th>스탯</th><th>종족</th><th>개체</th><th>노력</th><th>성격</th><th style="color:#d32f2f;">실능</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${STAT_KEYS.map(key => {
                                        const realVal = key === 'hp' ? hpReal : (key === 'atk' ? atkReal : (key === 'def' ? defReal : (key === 'spa' ? spaReal : (key === 'spd' ? spdReal : calcStat(key)))));
                                        return `
                                        <tr style="border-bottom: 1px solid #eee;">
                                            <td style="padding:10px; font-weight:bold; color:${STAT_COLORS[key]}">${STAT_NAMES[key]}</td>
                                            <td><input type="number" class="base-stat-input" data-stat="${key}" value="${baseStats[key]}" style="width:50px; text-align:center;" /></td>
                                            <td><input type="number" class="iv-input" data-stat="${key}" value="${ivs[key]}" style="width:40px; text-align:center;" /></td>
                                            <td><input type="number" class="ev-input" data-stat="${key}" value="${evs[key]}" style="width:50px; text-align:center;" /></td>
                                            <td>${key === 'hp' ? '-' : `<input type="radio" name="nature-plus" value="${key}" ${naturePlus === key ? 'checked' : ''} />+ <input type="radio" name="nature-minus" value="${key}" ${natureMinus === key ? 'checked' : ''} />-`}</td>
                                            <td style="font-size:1.2em; font-weight:bold; color:#d32f2f;">${realVal}</td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px;">
                        <div style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                            <h3 style="margin-top:0;">결정력 계산</h3>
                            <div id="move-autocomplete-container"></div>
                            <div style="font-size:1.5em; font-weight:bold; color:#f57c00; text-align:center; padding:10px; background:rgba(245,124,0,0.1); border-radius:8px; margin-top:10px;">
                                결정력: ${powerVal.toLocaleString()}
                            </div>
                        </div>
                        <div style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                            <h3 style="margin-top:0;">내구력 계산</h3>
                            <p>물리내구: <strong>${physBulk.toLocaleString()}</strong></p>
                            <p>특수내구: <strong>${specBulk.toLocaleString()}</strong></p>
                        </div>
                    </div>
                </div>

                <div id="nature-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center;">
                    <div style="background:#fff; width:95%; max-width:500px; border-radius:12px; padding:20px; position:relative;">
                        <button id="modal-close" style="position:absolute; top:10px; right:10px; border:none; background:none; font-size:1.5em; cursor:pointer;">&times;</button>
                        <h3>성격 보정표</h3>
                        <p style="font-size:0.9em;">성격에 따라 능력치가 1.1배 증가하거나 0.9배 감소합니다. (HP 제외)</p>
                        <table style="width:100%; border-collapse:collapse; font-size:0.8em; text-align:center;">
                            <tr style="background:#eee;"><th>성격</th><th>증가(+)</th><th>감소(-)</th></tr>
                            <tr><td>고집</td><td>공격</td><td>특공</td></tr>
                            <tr><td>명랑</td><td>스피드</td><td>특공</td></tr>
                            <tr><td>겁쟁이</td><td>스피드</td><td>공격</td></tr>
                            <tr><td>조심</td><td>특공</td><td>공격</td></tr>
                            <tr><td>차분</td><td>특방</td><td>공격</td></tr>
                            <tr><td>신중</td><td>특방</td><td>특공</td></tr>
                            <tr><td>대담</td><td>방어</td><td>공격</td></tr>
                            <tr><td>장난꾸러기</td><td>방어</td><td>특공</td></tr>
                        </table>
                    </div>
                </div>
            `;
            attachEvents();
        };

        const attachEvents = () => {
            createAutocomplete({
                container: container.querySelector('#poke-autocomplete-container')!,
                label: '포켓몬 검색', placeholder: '이름 입력', data: fullData,
                initialValue: selectedPoke?.nameKo,
                getSearchKey: p => p.searchKey, getDisplayName: p => p.nameKo, getDisplaySub: p => `(${p.nameEn})`,
                onSelect: p => { selectedPoke = p; baseStats = { ...p.stats as any }; renderUI(); }
            });

            createAutocomplete({
                container: container.querySelector('#move-autocomplete-container')!,
                label: '기술 검색', placeholder: '이름 입력', data: movesData.filter(m => m.category !== 'status'),
                initialValue: selectedMove?.nameKo,
                getSearchKey: m => m.searchKey, getDisplayName: m => m.nameKo, getDisplaySub: m => `(위력 ${m.power})`,
                onSelect: m => { selectedMove = m; renderUI(); },
                renderItemExtra: m => `<span style="display:inline-block; width:12px; height:12px; background:${TYPE_COLORS[m.type]}; border-radius:2px;"></span>`
            });

            container.querySelector('#level-input')?.addEventListener('change', (e) => {
                level = parseInt((e.target as HTMLInputElement).value) || 50; renderUI();
            });

            container.querySelectorAll('.base-stat-input').forEach(el => el.addEventListener('change', (e) => {
                const s = (e.target as HTMLElement).getAttribute('data-stat') as StatKey;
                baseStats[s] = parseInt((e.target as HTMLInputElement).value) || 0; renderUI();
            }));

            container.querySelectorAll('.iv-input').forEach(el => el.addEventListener('change', (e) => {
                const s = (e.target as HTMLElement).getAttribute('data-stat') as StatKey;
                ivs[s] = parseInt((e.target as HTMLInputElement).value) || 0; renderUI();
            }));

            container.querySelectorAll('.ev-input').forEach(el => el.addEventListener('change', (e) => {
                const s = (e.target as HTMLElement).getAttribute('data-stat') as StatKey;
                evs[s] = parseInt((e.target as HTMLInputElement).value) || 0; renderUI();
            }));

            container.querySelectorAll('input[name="nature-plus"]').forEach(el => el.addEventListener('change', (e) => {
                naturePlus = (e.target as HTMLInputElement).value as StatKey; renderUI();
            }));

            container.querySelectorAll('input[name="nature-minus"]').forEach(el => el.addEventListener('change', (e) => {
                natureMinus = (e.target as HTMLInputElement).value as StatKey; renderUI();
            }));

            container.querySelector('#btn-nature-table')?.addEventListener('click', () => container.querySelector<HTMLElement>('#nature-modal')!.style.display = 'flex');
            container.querySelector('#modal-close')?.addEventListener('click', () => container.querySelector<HTMLElement>('#nature-modal')!.style.display = 'none');
        };

        renderUI();
    } catch (err) {
        container.innerHTML = `<p style="color:red; text-align:center;">오류: ${err}</p>`;
    }
    return () => {};
}
