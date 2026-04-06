import { TYPE_MATCHUPS, TYPE_NAMES_KO, TYPE_COLORS, POKEMON_TYPES } from '../../data/constants.js';
import type { PokemonType } from '../../data/constants.js';

export function renderTypeCalculator(container: HTMLElement) {
    let type1: PokemonType | 'none' = 'none';
    let type2: PokemonType | 'none' = 'none';

    container.innerHTML = `
        <div class="type-calc-container">
            <h2>타입 계산기</h2>
            <p>포켓몬의 타입을 선택하면 방어 상성(받는 데미지)과 공격 상성(STAB 찌를 시 최대 데미지)을 보여줍니다.</p>

            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                <label>
                    <span style="display:block; margin-bottom: 5px; font-weight: bold;">타입 1</span>
                    <select id="select-type1" style="padding: 8px; font-size: 1rem; border-radius: 4px;">
                        <option value="none">선택 안함</option>
                        ${POKEMON_TYPES.map(t => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join('')}
                    </select>
                </label>
                <label>
                    <span style="display:block; margin-bottom: 5px; font-weight: bold;">타입 2 (복합)</span>
                    <select id="select-type2" style="padding: 8px; font-size: 1rem; border-radius: 4px;">
                        <option value="none">선택 안함</option>
                        ${POKEMON_TYPES.map(t => `<option value="${t}">${TYPE_NAMES_KO[t]}</option>`).join('')}
                    </select>
                </label>
            </div>

            <div id="matchup-results">
                <!-- 상성 결과가 동적으로 렌더링될 곳 -->
            </div>
        </div>
    `;

    const select1 = container.querySelector<HTMLSelectElement>('#select-type1')!;
    const select2 = container.querySelector<HTMLSelectElement>('#select-type2')!;
    const resultsContainer = container.querySelector<HTMLDivElement>('#matchup-results')!;

    const renderResults = () => {
        if (type1 === 'none' && type2 === 'none') {
            resultsContainer.innerHTML = '<p style="color: #888;">타입을 1개 이상 선택해주세요.</p>';
            return;
        }

        const currentTypes: PokemonType[] = [];
        if (type1 !== 'none') currentTypes.push(type1);
        if (type2 !== 'none' && type1 !== type2) currentTypes.push(type2);

        // 방어 상성 계산 (곱연산)
        const defMatchups: Record<number, PokemonType[]> = { 4: [], 2: [], 1: [], 0.5: [], 0.25: [], 0: [] };

        POKEMON_TYPES.forEach(atkType => {
            let multiplier = 1;
            currentTypes.forEach(defType => {
                multiplier *= TYPE_MATCHUPS[atkType][defType];
            });
            if (defMatchups[multiplier]) {
               defMatchups[multiplier]!.push(atkType);
            }
        });

        // 공격 상성 계산 (사용자가 명확히 지시하지 않은 공격상성 병합 논리는 
        // 최댓값 취하기로 "가정"하고 주석/설명을 명시하여 트레이드오프를 드러냄)
        const offMatchups: Record<number, PokemonType[]> = { 2: [], 1: [], 0.5: [], 0: [] };

        POKEMON_TYPES.forEach(defType => {
            let maxMultiplier = 0;
            currentTypes.forEach(atkType => {
                const mult = TYPE_MATCHUPS[atkType][defType];
                if (mult > maxMultiplier) maxMultiplier = mult;
            });
            if (offMatchups[maxMultiplier]) {
               offMatchups[maxMultiplier]!.push(defType);
            }
        });

        const renderTypeList = (types: PokemonType[]) => {
            if (types.length === 0) return '<span style="color: #999; font-size: 0.9em;">-</span>';
            return types.map(t => 
                `<span style="display:inline-block; background-color: ${TYPE_COLORS[t]}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; margin: 2px 5px 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.5);">${TYPE_NAMES_KO[t]}</span>`
            ).join('');
        };

        resultsContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #d32f2f;">방어 상성 (받는 데미지)</h3>
                    ${currentTypes.length === 2 ? '<p style="font-size: 0.85em; color:#666; margin-top:-10px;">복합 방어 상성은 두 타입이 받는 배율을 <strong>곱셈</strong>하여 표기합니다.</p>' : ''}
                    <div style="display: grid; grid-template-columns: 60px 1fr; gap: 10px; align-items: center;">
                        ${[4, 2, 0.5, 0.25, 0].filter(m => defMatchups[m] && defMatchups[m].length > 0)
                            .map(m => `
                            <div style="font-weight: bold; text-align: right; font-size: 1.1em; color: ${m > 1 ? '#d32f2f' : '#2e7d32'}">${m}배</div>
                            <div>${renderTypeList(defMatchups[m] || [])}</div>
                        `).join('')}
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1976d2;">자속 공격 타점 (주는 데미지)</h3>
                    <p style="font-size: 0.85em; color:#666; margin-top:-10px;">두 타입 중 가장 <strong>데미지가 많이 들어가는(효과적인) 공격</strong>을 고를 때의 배율입니다. 단일 타입 방어자를 기준으로 합니다.</p>
                    <div style="display: grid; grid-template-columns: 60px 1fr; gap: 10px; align-items: center;">
                        ${[2, 0.5, 0].filter(m => offMatchups[m] && offMatchups[m].length > 0)
                            .map(m => `
                            <div style="font-weight: bold; text-align: right; font-size: 1.1em; color: ${m > 1 ? '#1976d2' : '#888'}">${m}배</div>
                            <div>${renderTypeList(offMatchups[m] || [])}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    select1.addEventListener('change', (e) => {
        type1 = (e.target as HTMLSelectElement).value as PokemonType | 'none';
        renderResults();
    });

    select2.addEventListener('change', (e) => {
        type2 = (e.target as HTMLSelectElement).value as PokemonType | 'none';
        renderResults();
    });

    // 초기에 비어있는 화면 렌더링
    renderResults();

    return () => {}; // 탭 전환 시 딱히 해제할 이벤트 리스너(글로벌) 없음
}
