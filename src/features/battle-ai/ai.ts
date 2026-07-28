import { TYPE_MATCHUPS } from "../../data/constants.js";
import { calculateTypeMultiplier } from "../../utils/pokemon-math.js";
import type { AILevel, BattleAction, BattleSide } from "./types.js";

/**
 * 입문 AI: 가장 강한 데미지를 주는 기술을 선택합니다.
 * 공격 기술이 없으면 랜덤하게 행동합니다.
 */
export function decideBeginnerAction(side: BattleSide, opponentSide: BattleSide): BattleAction {
    const activePoke = side.team[side.activeIdx];
    const opponentPoke = opponentSide.team[opponentSide.activeIdx];

    if (!activePoke || activePoke.isFainted) {
        // 교체해야 하는 상황 (기절 등) - 살아있는 포켓몬 중 첫 번째로 교체
        const nextIdx = side.team.findIndex((p) => !p.isFainted);
        const action: BattleAction = { type: "switch", side: "opponent" };
        if (nextIdx !== -1) action.switchIdx = nextIdx;
        return action;
    }

    let bestMoveIdx = -1;
    let maxDamage = -1;

    activePoke.moves.forEach((move, idx) => {
        if (!move || !opponentPoke || (move.power || 0) <= 0) return;

        // 단순화된 데미지 계산 (자속, 상성만 고려)
        const typeMult = calculateTypeMultiplier(move.type, opponentPoke.data.types, TYPE_MATCHUPS as any);
        const isStab = activePoke.data.types.includes(move.type as any);
        const estimatedDmg = (move.power || 0) * typeMult * (isStab ? 1.5 : 1.0);

        if (estimatedDmg > maxDamage) {
            maxDamage = estimatedDmg;
            bestMoveIdx = idx;
        }
    });

    if (bestMoveIdx !== -1) {
        return { type: "move", side: "opponent", moveIdx: bestMoveIdx };
    }

    // 쓸 기술이 없으면 랜덤하게
    const validMoveIndices = activePoke.moves.map((m, i) => (m ? i : -1)).filter((i) => i !== -1);
    if (validMoveIndices.length > 0) {
        const randomMoveIdx = validMoveIndices[Math.floor(Math.random() * validMoveIndices.length)];
        const moveAction: BattleAction = { type: "move", side: "opponent" };
        if (randomMoveIdx !== undefined) moveAction.moveIdx = randomMoveIdx;
        return moveAction;
    }

    // 최후의 수단: 교체
    const otherIdx = side.team.findIndex((p, i) => !p.isFainted && i !== side.activeIdx);
    const switchAction: BattleAction = { type: "switch", side: "opponent" };
    if (otherIdx !== -1) switchAction.switchIdx = otherIdx;
    return switchAction;
}

export function decideNormalAction(side: BattleSide, opponentSide: BattleSide): BattleAction {
    // TODO: 일반 난이도 구현 (연산 속도 최적화 중심)
    return decideBeginnerAction(side, opponentSide);
}

export function decideExpertAction(side: BattleSide, opponentSide: BattleSide): BattleAction {
    // TODO: 전문 난이도 구현 (정교한 예측 및 랭크업 고려)
    return decideBeginnerAction(side, opponentSide);
}

export function getAiAction(level: AILevel, side: BattleSide, opponentSide: BattleSide): BattleAction {
    switch (level) {
        case "expert":
            return decideExpertAction(side, opponentSide);
        case "normal":
            return decideNormalAction(side, opponentSide);
        default:
            return decideBeginnerAction(side, opponentSide);
    }
}
