
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
    // M=100 (Max HP %), H=hpPercent
    const M = 100;
    const H = hpPercent;
    
    const firstPart = ((3 * M - 2 * H) * captureRate * ballBonus) / (3 * M);
    const X = firstPart * statusBonus;

    if (X >= 255) return 100;

    // b = 65536 / (255/X)^(1/4)
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
