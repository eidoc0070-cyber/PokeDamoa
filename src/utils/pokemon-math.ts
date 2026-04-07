
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
