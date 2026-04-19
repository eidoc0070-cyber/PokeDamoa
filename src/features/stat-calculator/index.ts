import { fetchPokedexData, fetchMovesData } from '../../data/pokeapi.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';
import { TYPE_COLORS, TYPE_NAMES_KO } from '../../data/constants.js';
import { calculateStat, calculateBulk, calculatePower } from '../../utils/pokemon-math.js';
import { createAutocomplete } from '../../components/SearchAutocomplete.js';
import { renderStatInputCard } from '../../components/StatInputCard.js'; // 모듈화된 카드 UI

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
                    <div class="card" style="margin-bottom:0;">
                        <h2 class="card-title">실수값(실능) 계산기</h2>
                        <div id="poke-autocomplete-container"></div>
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                            <label style="font-weight:bold; display:flex; align-items:center; gap:8px;">
                                레벨 : <input type="number" id="level-input" class="form-control" value="${level}" min="1" max="100" style="width: 80px; text-align:center;" />
                            </label>
                            <button id="btn-nature-table" class="btn" style="color:var(--primary-color); border-color:var(--primary-color);">📋 성격표</button>
                        </div>
                        
                        ${selectedPoke ? `
                        <div style="margin-top:20px; background:rgba(0,0,0,0.03); border-radius:12px; padding:15px; display:flex; align-items:center; gap:15px;">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPoke.id}.png" style="width:80px; height:80px; image-rendering:pixelated; background:#fff; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.1);" />
                            <div>
                                <h3 style="margin:0 0 5px 0;">${selectedPoke.nameKo}</h3>
                                <div>
                                    ${selectedPoke.types.map(t => `<span style="display:inline-block; padding: 4px 10px; background: ${TYPE_COLORS[t]}; color:#fff; border-radius:20px; font-size:0.8rem; margin-right:4px;">${TYPE_NAMES_KO[t]}</span>`).join('')}
                                </div>
                            </div>
                        </div>` : ''}
                    </div>

                    <div style="background:transparent;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:0 5px;">
                            <h3 style="margin:0; font-size:1.1rem; color:var(--text-color);">능력치 세팅 (카드뷰)</h3>
                            <span style="font-size:0.9rem; font-weight:bold; padding:4px 10px; border-radius:20px; background:${evTotal > 510 ? '#ffebee' : '#e8f5e9'}; color:${evTotal > 510 ? '#d32f2f' : '#2e7d32'}; box-shadow:0 1px 3px rgba(0,0,0,0.1);">노력치: ${evTotal}/510</span>
                        </div>
                        
                        <div style="display:flex; flex-direction:column;">
                            ${STAT_KEYS.map(key => {
                                const realVal = key === 'hp' ? hpReal : (key === 'atk' ? atkReal : (key === 'def' ? defReal : (key === 'spa' ? spaReal : (key === 'spd' ? spdReal : calcStat(key)))));
                                return renderStatInputCard({
                                    statKey: key,
                                    statName: STAT_NAMES[key],
                                    statColor: STAT_COLORS[key],
                                    base: baseStats[key],
                                    iv: ivs[key],
                                    ev: evs[key],
                                    naturePlus: naturePlus === key,
                                    natureMinus: natureMinus === key,
                                    realVal
                                });
                            }).join('')}
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:15px;">
                        <div class="card">
                            <h3 style="margin-top:0; color:var(--text-color);">결정력 계산</h3>
                            <div id="move-autocomplete-container"></div>
                            <div style="font-size:1.4rem; font-weight:bold; color:#f57c00; text-align:center; padding:15px; background:rgba(245,124,0,0.1); border-radius:12px; margin-top:15px;">
                                결정력: ${powerVal.toLocaleString()}
                            </div>
                        </div>
                        <div class="card">
                            <h3 style="margin-top:0; color:var(--text-color);">내구력 계산</h3>
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <div style="display:flex; justify-content:space-between; padding:15px; background:rgba(0,0,0,0.03); border-radius:12px;">
                                    <span style="color:var(--text-muted);">물리내구</span>
                                    <strong style="font-size:1.2rem;">${physBulk.toLocaleString()}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:15px; background:rgba(0,0,0,0.03); border-radius:12px;">
                                    <span style="color:var(--text-muted);">특수내구</span>
                                    <strong style="font-size:1.2rem;">${specBulk.toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="nature-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(3px);">
                    <div style="background:var(--surface-color); width:90%; max-width:400px; border-radius:16px; padding:25px; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                        <button id="modal-close" style="position:absolute; top:15px; right:15px; border:none; background:rgba(0,0,0,0.05); width:30px; height:30px; border-radius:50%; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
                        <h3 style="margin-top:0; color:var(--text-color);">성격 보정표</h3>
                        <p style="font-size:0.9rem; color:var(--text-muted);">성격에 따라 특정 능력치가 증감합니다. (HP 제외)</p>
                        <div style="overflow:hidden; border-radius:8px; border:1px solid var(--border-color);">
                            <table style="width:100%; border-collapse:collapse; font-size:0.9rem; text-align:center;">
                                <tr style="background:rgba(0,0,0,0.05); border-bottom:1px solid var(--border-color);">
                                    <th style="padding:10px;">성격</th>
                                    <th style="padding:10px; color:#d32f2f;">증가(+)</th>
                                    <th style="padding:10px; color:#1976d2;">감소(-)</th>
                                </tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">고집</td><td style="color:#d32f2f;">공격</td><td style="color:#1976d2;">특공</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">명랑</td><td style="color:#d32f2f;">스피드</td><td style="color:#1976d2;">특공</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">겁쟁이</td><td style="color:#d32f2f;">스피드</td><td style="color:#1976d2;">공격</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">조심</td><td style="color:#d32f2f;">특공</td><td style="color:#1976d2;">공격</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">차분</td><td style="color:#d32f2f;">특방</td><td style="color:#1976d2;">공격</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">신중</td><td style="color:#d32f2f;">특방</td><td style="color:#1976d2;">특공</td></tr>
                                <tr style="border-bottom:1px solid var(--border-color);"><td style="padding:8px;">대담</td><td style="color:#d32f2f;">방어</td><td style="color:#1976d2;">공격</td></tr>
                                <tr><td style="padding:8px;">장난꾸러기</td><td style="color:#d32f2f;">방어</td><td style="color:#1976d2;">특공</td></tr>
                            </table>
                        </div>
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
        container.innerHTML = `<div class="card"><p style="color:red; text-align:center;">오류: ${err}</p></div>`;
    }
    return () => {};
}
