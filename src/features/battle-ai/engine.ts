import type { BattleState, BattleAction, BattlePokemon, BattleSide, BattleLog } from './types.js';
import { calculateBaseDamage, calculateDamageRolls, getRankMultiplier, calculateTypeMultiplier } from '../../utils/pokemon-math.js';
import type { MoveData } from '../../data/pokeapi.js';
import { TYPE_MATCHUPS } from '../../data/constants.js';

/**
 * 배틀 엔진의 메인 진입점. 한 턴의 행동을 처리합니다.
 */
export function executeTurn(state: BattleState, playerAction: BattleAction, opponentAction: BattleAction): BattleState {
    const newState = JSON.parse(JSON.stringify(state)) as BattleState;

    // 1. 행동 우선순위 결정
    const firstSide = determineOrder(newState, playerAction, opponentAction);
    const actions = firstSide === 'player' 
        ? [playerAction, opponentAction] 
        : [opponentAction, playerAction];

    // 2. 행동 순차 실행
    for (const action of actions) {
        if (newState.isFinished) break;
        processAction(newState, action);
        
        // 행동 후 승리 조건 체크 및 즉각적인 상태 갱신 (예: 기절)
        checkWinCondition(newState);
    }

    newState.turn += 1;
    return newState;
}

/**
 * 행동 순서를 결정합니다 (우선도 -> 스피드).
 */
function determineOrder(state: BattleState, pAction: BattleAction, oAction: BattleAction): 'player' | 'opponent' {
    const getPriority = (action: BattleAction, side: BattleSide) => {
        if (action.type === 'switch') return 1000;
        const poke = side.team[side.activeIdx];
        if (!poke) return 0;
        const move = action.moveIdx !== undefined ? poke.moves[action.moveIdx] : null;
        return move?.priority || 0;
    };

    const pPrio = getPriority(pAction, state.player);
    const oPrio = getPriority(oAction, state.opponent);

    if (pPrio !== oPrio) return pPrio > oPrio ? 'player' : 'opponent';

    const pActive = state.player.team[state.player.activeIdx];
    const oActive = state.opponent.team[state.opponent.activeIdx];
    
    if (!pActive || !oActive) return pActive ? 'player' : 'opponent';

    const pSpe = pActive.calculatedStats.spe * getRankMultiplier(pActive.ranks.spe);
    const oSpe = oActive.calculatedStats.spe * getRankMultiplier(oActive.ranks.spe);

    if (pSpe !== oSpe) return pSpe > oSpe ? 'player' : 'opponent';
    return Math.random() > 0.5 ? 'player' : 'opponent';
}

/**
 * 단일 행동(교체 또는 기술 사용)을 처리합니다.
 */
function processAction(state: BattleState, action: BattleAction) {
    const side = action.side === 'player' ? state.player : state.opponent;
    const opponentSide = action.side === 'player' ? state.opponent : state.player;
    const attacker = side.team[side.activeIdx];
    const defender = opponentSide.team[opponentSide.activeIdx];

    if (!attacker || !defender) return;

    // 교체 처리
    if (action.type === 'switch') {
        handleSwitch(state, side, action.switchIdx ?? -1);
        return;
    }

    // 기술 사용 처리 (기절 상태 체크)
    if (attacker.isFainted) return;

    if (action.type === 'move') {
        const move = action.moveIdx !== undefined ? attacker.moves[action.moveIdx] : null;
        if (!move) return;

        performMove(state, side, opponentSide, move);
    }
}

/**
 * 교체 로직을 처리합니다. (Hook: onBeforeSwitch, onAfterSwitch 추가 예정)
 */
function handleSwitch(state: BattleState, side: BattleSide, nextIdx: number) {
    const oldPoke = side.team[side.activeIdx];
    const nextPoke = side.team[nextIdx];

    if (nextIdx === -1 || !nextPoke || nextPoke.isFainted) return;

    const oldName = oldPoke?.data.nameKo || '포켓몬';
    side.activeIdx = nextIdx;
    const newName = nextPoke.data.nameKo;

    state.logs.push({ 
        type: 'switch', 
        message: `${side.name}은(는) ${oldPoke?.isFainted ? '' : oldName + '을(를) 불러들이고 '}${newName}을(를) 내보냈다!` 
    });
    
    // TODO: Hook - onEntry (위협 등 등장 시 발동 효과)
}

/**
 * 기술 실행 메인 로직입니다. (Hook: onBeforeMove, onAfterMove 추가 예정)
 */
function performMove(state: BattleState, attackerSide: BattleSide, defenderSide: BattleSide, move: MoveData) {
    const attacker = attackerSide.team[attackerSide.activeIdx];
    const defender = defenderSide.team[defenderSide.activeIdx];
    
    if (!attacker || !defender) return;
    
    state.logs.push({ type: 'info', message: `${attackerSide.name}의 ${attacker.data.nameKo}! ${move.nameKo} 사용!` });

    // TODO: Hook - onBeforeMove (명중률 체크, 풀죽음 등)

    if (move.power && move.power > 0) {
        // 데미지 계산 및 적용
        const damage = calculateMoveDamage(attacker, defender, move);
        applyDamage(state, defenderSide, damage.actual, damage.typeMult);
    } else {
        // 변화기 처리 (향후 1단계에서 확장)
        state.logs.push({ type: 'info', message: `그러나 아무 일도 일어나지 않았다.` });
    }

    // TODO: Hook - onAfterMove (반동 데미지, 도구 소모 등)
}

/**
 * 실전 데미지 공식을 사용하여 데미지를 계산합니다. (Hook: onDamageCalculate 추가 예정)
 */
function calculateMoveDamage(attacker: BattlePokemon, defender: BattlePokemon, move: MoveData) {
    const category = move.category;
    
    // 공격/방어 능력치 결정
    const atkStat = category === 'physical' 
        ? attacker.calculatedStats.atk * getRankMultiplier(attacker.ranks.atk) 
        : attacker.calculatedStats.spa * getRankMultiplier(attacker.ranks.spa);
    
    const defStat = category === 'physical' 
        ? defender.calculatedStats.def * getRankMultiplier(defender.ranks.def) 
        : defender.calculatedStats.spd * getRankMultiplier(defender.ranks.spd);

    // 보정치 계산
    const isStab = attacker.data.types.includes(move.type as any);
    const typeMult = calculateTypeMultiplier(move.type, defender.data.types, TYPE_MATCHUPS as any);

    // TODO: Hook - onDamageMod (특성/도구에 의한 최종 데미지 배율 조정)

    const baseDmg = calculateBaseDamage(attacker.level, move.power || 0, atkStat, defStat);
    const rolls = calculateDamageRolls(baseDmg, isStab ? 1.5 : 1.0, typeMult);
    const actual = rolls[Math.floor(Math.random() * rolls.length)] || 0;

    return { actual, typeMult };
}

/**
 * 계산된 데미지를 실제 HP에 반영합니다.
 */
function applyDamage(state: BattleState, defenderSide: BattleSide, damage: number, typeMult: number) {
    const defender = defenderSide.team[defenderSide.activeIdx];
    if (!defender) return;
    
    defender.currentHp = Math.max(0, defender.currentHp - damage);
    state.logs.push({ type: 'damage', message: `${defenderSide.name}의 ${defender.data.nameKo}에게 ${damage}의 데미지!` });

    if (typeMult > 1) state.logs.push({ type: 'info', message: `효과가 굉장했다!` });
    else if (typeMult < 1 && typeMult > 0) state.logs.push({ type: 'info', message: `효과가 별로인 듯하다...` });
    else if (typeMult === 0) state.logs.push({ type: 'info', message: `효과가 없는 것 같다.` });

    if (defender.currentHp <= 0) {
        defender.isFainted = true;
        state.logs.push({ type: 'faint', message: `${defenderSide.name}의 ${defender.data.nameKo}은(는) 쓰러졌다!` });
    }
}

/**
 * 배틀 종료 조건을 체크합니다.
 */
function checkWinCondition(state: BattleState) {
    const playerAllFainted = state.player.team.every(p => p.isFainted);
    const opponentAllFainted = state.opponent.team.every(p => p.isFainted);

    if (opponentAllFainted) {
        state.isFinished = true;
        state.winner = 'player';
        state.logs.push({ type: 'win', message: `상대의 포켓몬이 모두 쓰러졌다! 당신의 승리!` });
    } else if (playerAllFainted) {
        state.isFinished = true;
        state.winner = 'opponent';
        state.logs.push({ type: 'win', message: `당신의 포켓몬이 모두 쓰러졌다! 당신의 패배...` });
    }
}

