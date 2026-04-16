import { TYPE_MATCHUPS, TYPE_NAMES_KO, TYPE_COLORS, POKEMON_TYPES } from '../../data/constants.js';
import type { PokemonType } from '../../data/constants.js';
import { getDefenseMatchups, getOffensiveCoverage } from '../../utils/pokemon-math.js';

export function renderTypeCalculator(container: HTMLElement) {
    const selectedTypes: (PokemonType | 'none')[] = ['none', 'none', 'none', 'none'];

    const renderSelects = () => {
        return selectedTypes.map((type, index) => `
            <label>
                <span style="display:block; margin-bottom: 5px; font-weight: bold;">타입 ${index + 1}</span>
                <select id="select-type${index + 1}" style="padding: 8px; font-size: 1rem; border-radius: 4px; width: 100px;">
                    <option value="none">선택 안함</option>
                    ${POKEMON_TYPES.map(t => `<option value="${t}" ${type === t ? 'selected' : ''}>${TYPE_NAMES_KO[t]}</option>`).join('')}
                </select>
            </label>
        `).join('');
    };

    container.innerHTML = `
        <div class="type-calc-container">
            <h2>타입 계산기</h2>
            <p>포켓몬의 타입을 선택하면 방어 상성(받는 데미지)과 공격 상성(STAB 찌를 시 최대 데미지)을 보여줍니다. (최대 4개)</p>

            <div id="type-selects" style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
                ${renderSelects()}
            </div>

            <div id="matchup-results">
                <!-- 상성 결과가 동적으로 렌더링될 곳 -->
            </div>
        </div>
    `;

    const resultsContainer = container.querySelector<HTMLDivElement>('#matchup-results')!;

    const renderResults = () => {
        // 중복 제거하여 실제 계산에 사용할 타입 목록 추출
        const allSelected = selectedTypes.filter((t): t is PokemonType => t !== 'none');
        const currentTypes = Array.from(new Set(allSelected));

        if (currentTypes.length === 0) {
            resultsContainer.innerHTML = '<p style="color: #888;">타입을 1개 이상 선택해주세요.</p>';
            return;
        }

        // 중앙화된 헬퍼 사용
        const defMatchups = getDefenseMatchups(currentTypes, TYPE_MATCHUPS, POKEMON_TYPES);
        const offMatchups = getOffensiveCoverage(currentTypes, TYPE_MATCHUPS, POKEMON_TYPES);

        const renderTypeList = (types: string[]) => {
            if (types.length === 0) return '<span style="color: #999; font-size: 0.9em;">-</span>';
            return types.map(t => 
                `<span style="display:inline-block; background-color: ${TYPE_COLORS[t as PokemonType]}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; margin: 2px 5px 2px 0; text-shadow: 1px 1px 1px rgba(0,0,0,0.5);">${TYPE_NAMES_KO[t as PokemonType]}</span>`
            ).join('');
        };

        const sortedMultipliers = Object.keys(defMatchups)
            .map(Number)
            .sort((a, b) => b - a);

        resultsContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #d32f2f;">방어 상성 (받는 데미지)</h3>
                    ${currentTypes.length > 1 ? '<p style="font-size: 0.85em; color:#666; margin-top:-10px;">복합 방어 상성은 모든 타입이 받는 배율을 <strong>곱셈</strong>하여 표기합니다.</p>' : ''}
                    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: center;">
                        ${sortedMultipliers.filter(m => m !== 1)
                            .map(m => `
                            <div style="font-weight: bold; text-align: right; font-size: 1.1em; color: ${m > 1 ? '#d32f2f' : '#2e7d32'}">${m}배</div>
                            <div>${renderTypeList(defMatchups[m] || [])}</div>
                        `).join('')}
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.05); padding: 20px; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1976d2;">자속 공격 타점 (주는 데미지)</h3>
                    <p style="font-size: 0.85em; color:#666; margin-top:-10px;">선택한 타입 중 가장 <strong>데미지가 많이 들어가는(효과적인) 공격</strong>을 고를 때의 배율입니다. 단일 타입 방어자를 기준으로 합니다.</p>
                    <div style="display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: center;">
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

    const attachListeners = () => {
        selectedTypes.forEach((_, index) => {
            const select = container.querySelector<HTMLSelectElement>(`#select-type${index + 1}`)!;
            select.addEventListener('change', (e) => {
                selectedTypes[index] = (e.target as HTMLSelectElement).value as PokemonType | 'none';
                renderResults();
            });
        });
    };

    attachListeners();
    renderResults();

    return () => {};
}
