
/**
 * 포켓몬 능력치(실수값) 계산 공식
 * @param base 종족값
 * @param iv 개체값 (0-31)
 * @param ev 노력치 (0-252)
 * @param level 레벨 (1-100)
 * @param isHp HP 여부
 * @param nature 성격 보정 (1.1, 1.0, 0.9)
 */
export function calculateStat(
    base: number,
    iv: number,
    ev: number,
    level: number,
    isHp: boolean = false,
    nature: number = 1.0
): number {
    if (isHp) {
        if (base === 1) return 1; // 껍질몬 케이스
        return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
    }
    const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
    return Math.floor(raw * nature);
}

/**
 * 성격 보정 문자열을 배율 숫자로 변환
 */
export function getNatureMultiplier(nature: 'plus' | 'minus' | 'none' | number): number {
    if (typeof nature === 'number') return nature;
    if (nature === 'plus') return 1.1;
    if (nature === 'minus') return 0.9;
    return 1.0;
}

/**
 * 랭크 보정 배율
 */
export const RANK_MULTIPLIERS: Record<number, number> = {
    '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
    '0': 1,
    '1': 3/2, '2': 4/2, '3': 5/2, '4': 6/2, '5': 7/2, '6': 8/2
};

export function getRankMultiplier(rank: number): number {
    return RANK_MULTIPLIERS[rank] ?? 1.0;
}

/**
 * 내구력 계산 (HP * 방어/특방)
 */
export function calculateBulk(hp: number, defense: number): number {
    return hp * defense;
}

/**
 * 결정력 계산 (실수값 * 위력 * 자속 * 기타)
 */
export function calculatePower(stat: number, movePower: number, stab: number = 1.0, other: number = 1.0): number {
    return Math.floor(stat * movePower * stab * other);
}

/**
 * 데미지 계산 공식 (기본 공식)
 * @param level 공격자 레벨
 * @param power 기술 위력
 * @param attack 공격자 공격/특공 실수값
 * @param defense 방어자 방어/특방 실수값
 * @returns 기초 데미지 (난수 전)
 */
export function calculateBaseDamage(
    level: number,
    power: number,
    attack: number,
    defense: number
): number {
    if (defense === 0) defense = 1;
    return Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * power * attack / defense) / 50) + 2;
}

/**
 * 데미지 난수 및 보정 적용
 * @param baseDamage 기초 데미지
 * @param stab 자속 보정 (1.5, 2.0 등)
 * @param typeMultiplier 타입 상성 배율
 * @param otherModifiers 기타 보정 (도구, 특성 등)
 * @returns 16단계 난수 데미지 배열
 */
export function calculateDamageRolls(
    baseDamage: number,
    stab: number = 1.0,
    typeMultiplier: number = 1.0,
    otherModifiers: number = 1.0
): number[] {
    const rolls = [];
    for (let i = 85; i <= 100; i++) {
        let dmg = Math.floor(baseDamage * i / 100);
        dmg = Math.floor(dmg * stab);
        dmg = Math.floor(dmg * typeMultiplier);
        dmg = Math.floor(dmg * otherModifiers);
        rolls.push(dmg);
    }
    return rolls;
}

/**
 * 포획 확률 계산
 * @param captureRate 포켓몬의 기본 포획률 (0-255)
 * @param hpPercent 남은 HP 백분율 (1-100)
 * @param ballBonus 볼 배율 (1.0, 1.5, 2.0 등)
 * @param statusBonus 상태이상 배율 (1.0, 1.5, 2.5 등)
 */
export function calculateCatchChance(
    captureRate: number,
    hpPercent: number,
    ballBonus: number,
    statusBonus: number
): number {
    // X = [( (3*M - 2*H) * rate * ball ) / (3*M)] * status
    const M = 100;
    const H = hpPercent;
    
    const firstPart = ((3 * M - 2 * H) * captureRate * ballBonus) / (3 * M);
    const X = firstPart * statusBonus;

    if (X >= 255) return 100;

    const b = 65536 / Math.pow(255 / X, 0.25);
    const catchProb = Math.pow(b / 65536, 4) * 100;
    
    return Math.min(100, catchProb);
}

/**
 * 타입 상성 계산
 * @param attackerType 공격 기술 타입
 * @param defenderTypes 방어자 타입 배열
 * @param typeMatchups 상성 테이블 (Record<string, Record<string, number>>)
 * @returns 최종 상성 배율
 */
export function calculateTypeMultiplier(
    attackerType: string,
    defenderTypes: string[],
    typeMatchups: Record<string, Record<string, number>>
): number {
    let multiplier = 1.0;
    for (const defType of defenderTypes) {
        if (typeMatchups[attackerType] && typeMatchups[attackerType][defType] !== undefined) {
            multiplier *= typeMatchups[attackerType][defType];
        }
    }
    return multiplier;
}

/**
 * 방어 상성 분석 (방어자가 받는 모든 타입의 배율 계산)
 */
export function getDefenseMatchups(
    defenderTypes: string[],
    typeMatchups: Record<string, Record<string, number>>,
    allTypes: readonly string[]
): Record<number, string[]> {
    const results: Record<number, string[]> = {};
    allTypes.forEach(atkType => {
        const multiplier = calculateTypeMultiplier(atkType, defenderTypes, typeMatchups);
        if (!results[multiplier]) results[multiplier] = [];
        results[multiplier].push(atkType);
    });
    return results;
}

/**
 * 공격 상성 분석 (공격자가 가진 타입들로 찌를 수 있는 최대 배율 계산)
 */
export function getOffensiveCoverage(
    attackerTypes: string[],
    typeMatchups: Record<string, Record<string, number>>,
    allTypes: readonly string[]
): Record<number, string[]> {
    const results: Record<number, string[]> = { 2: [], 1: [], 0.5: [], 0: [] };
    allTypes.forEach(defType => {
        let maxMultiplier = 0;
        attackerTypes.forEach(atkType => {
            const mult = calculateTypeMultiplier(atkType, [defType], typeMatchups);
            if (mult > maxMultiplier) maxMultiplier = mult;
        });
        if (results[maxMultiplier]) {
            results[maxMultiplier].push(defType);
        }
    });
    return results;
}

/**
 * 특정 세대에 맞는 포켓몬 데이터를 추출하기 위한 유틸리티들
 */

export function getStatsForGen(p: any, genId: number) {
    // 1세대의 경우, 분리 전 특수 능력치(special)가 있었는지 우선 확인
    if (genId === 1) {
        const gen1Past = p.statsPast.find((x: any) => x.genId === 1);
        if (gen1Past && gen1Past.stats.special) {
            return {
                hp: gen1Past.stats.hp,
                atk: gen1Past.stats.atk,
                def: gen1Past.stats.def,
                spa: gen1Past.stats.special,
                spd: gen1Past.stats.special,
                spe: gen1Past.stats.spe
            };
        }
    }

    // 1. past 기록 확인 (정확히 해당 세대의 기록이 있는 경우)
    const past = p.statsPast.find((x: any) => x.genId === genId);
    if (past) return past.stats;
    
    return p.stats;
}

export function getTypesForGen(p: any, genId: number) {
    const past = p.typesPast.find((x: any) => x.genId === genId);
    if (past) return past.types;
    
    // 6세대 미만에서 페어리 타입 제거 등의 로직이 필요할 수 있으나, 
    // PokeAPI의 typesPast 데이터가 이를 이미 담고 있다고 가정함
    return p.types;
}

export function getAbilitiesForGen(p: any, genId: number) {
    const past = p.abilitiesPast.find((x: any) => x.genId === genId);
    if (past) return past.abilities;
    
    // 3세대 미만은 특성이 없음
    if (genId < 3) return [];
    
    return p.abilities;
}

export function getMoveForGen(m: any, genId: number) {
    let power = m.power;
    let pp = m.pp;
    let accuracy = m.accuracy;
    let type = m.type;

    // 타겟 세대 이후의 변경사항들을 거꾸로 적용하여 과거 값을 복원
    // changelog: { genId, power, pp, accuracy, type }
    const futureChanges = m.changelog
        .filter((c: any) => c.genId > genId)
        .sort((a: any, b: any) => b.genId - a.genId);

    // TODO: 데이터 빌드 시 changelog에 "이전 값"이 아닌 "변경된 시점의 값"을 넣었으므로 
    // 실제로는 해당 세대 이전의 가장 최신 기록을 찾아야 함.
    // 일단은 최신 값을 기본으로 표시.
    
    return { ...m, power, pp, accuracy, type };
}

/**
 * 특정 세대에서 포켓몬이 배울 수 있는 기술 ID 목록을 가져옵니다.
 */
export function getLearnableMoveIds(poke: any | null, genId: number): Set<number> {
    if (!poke) return new Set();
    // 세대 ID 매핑 (문자열인 경우 등 대비)
    const targetGen = typeof genId === 'number' ? genId : 9;
    return new Set(poke.learnsets[targetGen] || []);
}

/**
 * 포켓몬이 배우는 기술을 상단으로 정렬한 기술 목록을 반환합니다.
 */
export function getSortedMovesForPoke(moves: any[], poke: any | null, genId: number, filterFn?: (m: any) => boolean) {
    const learnableIds = getLearnableMoveIds(poke, genId);
    let filtered = moves;
    if (filterFn) {
        filtered = moves.filter(filterFn);
    }

    return [...filtered].sort((a, b) => {
        const aLearnable = learnableIds.has(a.id);
        const bLearnable = learnableIds.has(b.id);
        if (aLearnable && !bLearnable) return -1;
        if (!aLearnable && bLearnable) return 1;
        return a.nameKo.localeCompare(b.nameKo);
    });
}

/**
 * Autocomplete용 기술 아이템 스타일을 반환합니다.
 */
export function getMoveItemStyle(move: any, poke: any | null, genId: number) {
    if (!poke) return {};
    const learnableIds = getLearnableMoveIds(poke, genId);
    if (learnableIds.has(move.id)) {
        return { 
            background: 'rgba(255, 249, 196, 0.4)', 
            borderLeft: '4px solid #fbc02d'
        };
    }
    return {};
}

/**
 * Autocomplete용 기술 아이템 추가 정보를 반환합니다. (배지 등)
 */
export function renderMoveItemExtra(move: any, poke: any | null, genId: number, typeColors: Record<string, string>) {
    const learnableIds = getLearnableMoveIds(poke, genId);
    const isLearnable = learnableIds.has(move.id);
    
    return `
        <div style="display:flex; align-items:center; gap:5px;">
            ${isLearnable ? `<span style="background:#fbc02d; color:#fff; font-size:0.65rem; padding:1px 5px; border-radius:10px; font-weight:bold; white-space:nowrap;">습득 가능</span>` : ''}
            <span style="display:inline-block; width:12px; height:12px; background:${typeColors[move.type] || '#ccc'}; border-radius:3px;"></span>
        </div>
    `;
}
