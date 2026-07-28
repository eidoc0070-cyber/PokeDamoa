import { TYPE_MATCHUPS } from "../../data/constants.js";
import type { MoveData } from "../../data/pokeapi.js";
import {
    calculateBaseDamage,
    calculateDamageRolls,
    calculateTypeMultiplier,
    getRankMultiplier,
} from "../../utils/pokemon-math.js";
import type { BattleAction, BattlePokemon, BattleSide, BattleState, EffectTag, EventHook } from "./types.js";

/**
 * 배틀 엔진의 메인 진입점. 한 턴의 행동을 처리합니다.
 */
export function executeTurn(state: BattleState, playerAction: BattleAction, opponentAction: BattleAction): BattleState {
    const newState = JSON.parse(JSON.stringify(state)) as BattleState;

    // 1. 행동 우선순위 결정 (onStatCalc 훅 발동 가능)
    const firstSide = determineOrder(newState, playerAction, opponentAction);
    const actions = firstSide === "player" ? [playerAction, opponentAction] : [opponentAction, playerAction];

    // 2. 행동 순차 실행
    for (const action of actions) {
        if (newState.isFinished) break;
        processAction(newState, action);
        checkWinCondition(newState);
    }

    // 3. 턴 종료 처리 (onTurnEnd 훅)
    triggerGlobalHook(newState, "onTurnEnd");

    newState.turn += 1;
    return newState;
}

/**
 * 전역 훅을 실행합니다. (양쪽 포켓몬 모두 해당)
 */
function triggerGlobalHook(state: BattleState, hook: EventHook, context: any = {}) {
    // 플레이어 측 효과 실행
    const pActive = state.player.team[state.player.activeIdx];
    if (pActive) executeEffects(state, pActive, hook, context);

    // 상대방 측 효과 실행
    const oActive = state.opponent.team[state.opponent.activeIdx];
    if (oActive) executeEffects(state, oActive, hook, context);
}

/**
 * 특정 포켓몬의 활성 효과들을 특정 타이밍에 실행합니다.
 * (특성, 도구, 기술 효과 + 상태이상 효과 포함)
 */
export function executeEffects(state: BattleState, pokemon: BattlePokemon, hook: EventHook, context: any = {}) {
    const opponent =
        pokemon === state.player.team[state.player.activeIdx]
            ? state.opponent.team[state.opponent.activeIdx]
            : state.player.team[state.player.activeIdx];

    // 1. 포켓몬 자체의 효과 태그 (특성, 도구 등)
    let allTags = [...pokemon.effectTags];

    // 2. 상태이상에 의한 효과 태그 추가
    if (pokemon.status && state.statusData) {
        const statusKey = pokemon.status.toLowerCase();
        const statusDef = state.statusData[statusKey];
        if (statusDef?.effectTags) {
            allTags = [...allTags, ...statusDef.effectTags];
        } else {
            // alias 처리 (예: brn -> burn)
            for (const key in state.statusData) {
                if ((state.statusData[key] as any).alias === statusKey) {
                    const realStatus = state.statusData[key];
                    if (realStatus?.effectTags) {
                        allTags = [...allTags, ...realStatus.effectTags];
                    }
                    break;
                }
            }
        }
    }

    const effects = allTags.filter((tag) => tag.trigger === hook).sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const effect of effects) {
        if (checkCondition(state, pokemon, opponent, effect, context)) {
            applyEffect(state, pokemon, opponent, effect, context);
        }
    }
}

/**
 * 능력치 계산 (랭크 보정 및 onStatCalc 훅 적용)
 */
export function calculateFinalStat(state: BattleState, pokemon: BattlePokemon, statName: string): number {
    if (statName === "hp") return pokemon.currentHp;

    const baseStat = pokemon.calculatedStats[statName as keyof typeof pokemon.calculatedStats] || 0;
    const multiplier = getRankMultiplier(pokemon.ranks[statName as keyof typeof pokemon.ranks] || 0);

    // onStatCalc 훅을 통한 추가 보정 (마비 스피드 감소 등)
    const context = { stat: statName, multiplier: 1.0 };
    executeEffects(state, pokemon, "onStatCalc", context);

    return baseStat * multiplier * context.multiplier;
}

/**
 * 효과의 발동 조건을 체크합니다.
 */
function checkCondition(
    _state: BattleState,
    pokemon: BattlePokemon,
    _opponent: BattlePokemon | undefined,
    effect: EffectTag,
    context: any,
): boolean {
    if (!effect.condition) return true;

    try {
        // 간단한 조건 평가 로직 (구조화된 문자열 파싱)
        // 형식: "property operator value" (예: "hp_percent <= 50")
        const [prop, operator, valStr] = effect.condition.split(" ");
        const value = parseFloat(valStr || "0");

        let actualValue: number | string | undefined;

        switch (prop) {
            case "hp_percent":
                actualValue = (pokemon.currentHp / pokemon.maxHp) * 100;
                break;
            case "hp":
                actualValue = pokemon.currentHp;
                break;
            case "move_type":
                actualValue = context.move?.type;
                break;
            case "move_category":
                actualValue = context.move?.category;
                break;
            case "status":
                actualValue = pokemon.status || "none";
                break;
            case "random":
                actualValue = Math.random() * 100;
                break;
            default:
                actualValue = undefined;
        }

        if (actualValue === undefined) return false;

        switch (operator) {
            case "<=":
                return (actualValue as number) <= value;
            case "<":
                return (actualValue as number) < value;
            case ">=":
                return (actualValue as number) >= value;
            case ">":
                return (actualValue as number) > value;
            case "==":
                return actualValue === (Number.isNaN(value) ? valStr : value);
            case "!=":
                return actualValue !== (Number.isNaN(value) ? valStr : value);
            default:
                return false;
        }
    } catch (e) {
        console.error("Condition evaluation error:", e);
        return false;
    }
}

/**
 * 실제 효과 동작을 수행합니다.
 */
function applyEffect(
    state: BattleState,
    pokemon: BattlePokemon,
    opponent: BattlePokemon | undefined,
    effect: EffectTag,
    context: any,
) {
    const target = getTarget(state, pokemon, opponent, effect.target);
    if (!target) return;

    switch (effect.action) {
        case "modify_rank": {
            const { stat, stage } = effect.params;
            target.ranks[stat as keyof typeof target.ranks] = Math.max(
                -6,
                Math.min(6, (target.ranks[stat as keyof typeof target.ranks] || 0) + stage),
            );
            state.logs.push({
                type: "effect",
                message: `${target.data.nameKo}의 ${stat}이(가) ${stage > 0 ? "올랐다!" : "떨어졌다!"}`,
            });
            break;
        }
        case "modify_stat":
            if (context.stat === effect.params.stat) {
                context.multiplier *= effect.params.multiplier;
            }
            break;
        case "modify_damage":
            if (context.damageMod !== undefined) {
                context.damageMod *= effect.params.multiplier;
            }
            break;
        case "heal": {
            const healAmount = Math.floor(target.maxHp * (effect.params.percent / 100));
            target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
            state.logs.push({ type: "effect", message: `${target.data.nameKo}의 HP가 회복되었다!` });
            break;
        }
        case "damage": {
            const dmgAmount = Math.floor(target.maxHp * (effect.params.percent / 100));
            target.currentHp = Math.max(0, target.currentHp - dmgAmount);
            state.logs.push({ type: "effect", message: `${target.data.nameKo}은(는) 데미지를 입었다!` });
            if (target.currentHp <= 0) {
                target.isFainted = true;
                state.logs.push({ type: "faint", message: `${target.data.nameKo}은(는) 쓰러졌다!` });
            }
            break;
        }
        case "apply_status":
            if (!target.status) {
                target.status = effect.params.status;
                const statusKey = target.status || "";
                const statusName = (statusKey && state.statusData?.[statusKey]?.nameKo) || target.status;
                state.logs.push({
                    type: "effect",
                    message: `${target.data.nameKo}은(는) ${statusName} 상태가 되었다!`,
                });
            }
            break;
        case "cure_status":
            if (target.status) {
                const oldStatus = target.status;
                target.status = null;
                state.logs.push({ type: "effect", message: `${target.data.nameKo}의 ${oldStatus} 상태가 회복되었다!` });
            }
            break;
        case "drain":
            if (context.damageDealt) {
                const drainHp = Math.max(1, Math.floor(context.damageDealt * (effect.params.percent / 100)));
                target.currentHp = Math.min(target.maxHp, target.currentHp + drainHp);
                state.logs.push({ type: "effect", message: `${target.data.nameKo}은(는) 상대의 HP를 흡수했다!` });
            }
            break;
        case "recoil":
            if (context.damageDealt) {
                const recoilHp = Math.max(1, Math.floor(context.damageDealt * (effect.params.percent / 100)));
                target.currentHp = Math.max(0, target.currentHp - recoilHp);
                state.logs.push({ type: "effect", message: `${target.data.nameKo}은(는) 반동 데미지를 입었다!` });
                if (target.currentHp <= 0) {
                    target.isFainted = true;
                    state.logs.push({ type: "faint", message: `${target.data.nameKo}은(는) 쓰러졌다!` });
                }
            }
            break;
        case "set_weather":
            state.weather = effect.params.weather;
            state.logs.push({ type: "effect", message: `날씨가 ${state.weather}(으)로 변했다!` });
            break;
        case "prevent_action":
            if (context) {
                context.cancel = true;
                if (effect.params.message) {
                    state.logs.push({
                        type: "effect",
                        message: effect.params.message.replace("{name}", target.data.nameKo),
                    });
                }
            }
            break;
        case "custom":
            // 특수 로직 처리 (함수 주입 등 향후 확장)
            break;
    }
}

function getTarget(
    _state: BattleState,
    pokemon: BattlePokemon,
    opponent: BattlePokemon | undefined,
    targetType: string,
): BattlePokemon | undefined {
    if (targetType === "self") return pokemon;
    if (targetType === "opponent") return opponent;
    return undefined;
}

/**
 * 행동 순서를 결정합니다 (우선도 -> 스피드).
 */
function determineOrder(state: BattleState, pAction: BattleAction, oAction: BattleAction): "player" | "opponent" {
    const getPriority = (action: BattleAction, side: BattleSide) => {
        if (action.type === "switch") return 1000;
        const poke = side.team[side.activeIdx];
        if (!poke) return 0;
        const move = action.moveIdx !== undefined ? poke.moves[action.moveIdx] : null;
        return move?.priority || 0;
    };

    const pPrio = getPriority(pAction, state.player);
    const oPrio = getPriority(oAction, state.opponent);

    if (pPrio !== oPrio) return pPrio > oPrio ? "player" : "opponent";

    const pActive = state.player.team[state.player.activeIdx];
    const oActive = state.opponent.team[state.opponent.activeIdx];

    if (!pActive || !oActive) return pActive ? "player" : "opponent";

    const pSpe = calculateFinalStat(state, pActive, "spe");
    const oSpe = calculateFinalStat(state, oActive, "spe");

    if (pSpe !== oSpe) return pSpe > oSpe ? "player" : "opponent";
    return Math.random() > 0.5 ? "player" : "opponent";
}

/**
 * 단일 행동(교체 또는 기술 사용)을 처리합니다.
 */
function processAction(state: BattleState, action: BattleAction) {
    const side = action.side === "player" ? state.player : state.opponent;
    const opponentSide = action.side === "player" ? state.opponent : state.player;
    const attacker = side.team[side.activeIdx];
    const defender = opponentSide.team[opponentSide.activeIdx];

    if (!attacker || !defender) return;

    if (action.type === "switch") {
        handleSwitch(state, side, action.switchIdx ?? -1);
        return;
    }

    if (attacker.isFainted) return;

    if (action.type === "move") {
        const move = action.moveIdx !== undefined ? attacker.moves[action.moveIdx] : null;
        if (!move) return;

        performMove(state, side, opponentSide, move);
    }
}

/**
 * 교체 로직을 처리합니다. (Hook: onEntry, onSwitchOut)
 */
function handleSwitch(state: BattleState, side: BattleSide, nextIdx: number) {
    const oldPoke = side.team[side.activeIdx];
    const nextPoke = side.team[nextIdx];

    if (nextIdx === -1 || !nextPoke || nextPoke.isFainted) return;

    // onSwitchOut 발동
    if (oldPoke) executeEffects(state, oldPoke, "onSwitchOut");

    const oldName = oldPoke?.data.nameKo || "포켓몬";
    side.activeIdx = nextIdx;
    const newName = nextPoke.data.nameKo;

    state.logs.push({
        type: "switch",
        message: `${side.name}은(는) ${oldPoke?.isFainted ? "" : `${oldName}을(를) 불러들이고 `}${newName}을(를) 내보냈다!`,
    });

    // onEntry 발동 (예: 위협)
    executeEffects(state, nextPoke, "onEntry");
}

/**
 * 명중률 및 회피율 랭크를 반영하여 기술 명중 여부를 계산합니다.
 */
function checkAccuracy(attacker: BattlePokemon, defender: BattlePokemon, move: MoveData): boolean {
    if ((move.accuracy as any) === true || move.accuracy === undefined || move.accuracy === null) return true;
    const accStage = Math.max(-6, Math.min(6, (attacker.ranks.accuracy || 0) - (defender.ranks.evasion || 0)));
    const accMultiplier = accStage >= 0 ? (3 + accStage) / 3 : 3 / (3 - accStage);
    const finalAcc = move.accuracy * accMultiplier;
    return Math.random() * 100 <= finalAcc;
}

/**
 * 기술 실행 메인 로직입니다. (Hook: onBeforeMove, onAfterMove)
 */
function performMove(state: BattleState, attackerSide: BattleSide, defenderSide: BattleSide, move: MoveData) {
    const attacker = attackerSide.team[attackerSide.activeIdx];
    const defender = defenderSide.team[defenderSide.activeIdx];

    if (!attacker || !defender) return;

    // onBeforeMove (예: 명중률 체크, 풀죽음)
    const moveContext = { cancel: false };
    executeEffects(state, attacker, "onBeforeMove", moveContext);
    if (moveContext.cancel) return;

    state.logs.push({ type: "info", message: `${attackerSide.name}의 ${attacker.data.nameKo}! ${move.nameKo} 사용!` });

    // 명중 여보 체크
    if (!checkAccuracy(attacker, defender, move)) {
        state.logs.push({
            type: "info",
            message: `${attackerSide.name}의 ${attacker.data.nameKo}의 공격은 맞지 않았다!`,
        });
        return;
    }

    let actualDamage = 0;
    if (move.power && move.power > 0) {
        const damage = calculateMoveDamage(state, attacker, defender, move);
        actualDamage = damage.actual;
        applyDamage(state, defenderSide, damage.actual, damage.typeMult);
    }

    const effectContext = { move, damageDealt: actualDamage };

    // 기술 자체의 효과 태그 실행
    if (move.effectTags && move.effectTags.length > 0) {
        for (const tag of move.effectTags) {
            // 트리거가 없거나 onAfterMove인 경우 실행 (변화기는 즉시, 공격기는 후속 효과로)
            const isAppropriateTrigger = !tag.trigger || tag.trigger === "onAfterMove";
            if (isAppropriateTrigger && checkCondition(state, attacker, defender, tag, effectContext)) {
                applyEffect(state, attacker, defender, tag, effectContext);
            }
        }
    } else if (!move.power || move.power <= 0) {
        state.logs.push({ type: "info", message: `그러나 아무 일도 일어나지 않았다.` });
    }

    // onAfterMove (포켓몬이 가진 특성/도구 등의 후속 효과)
    executeEffects(state, attacker, "onAfterMove", effectContext);
}

/**
 * 실전 데미지 공식을 사용하여 데미지를 계산합니다. (Hook: onDamageCalc)
 */
function calculateMoveDamage(state: BattleState, attacker: BattlePokemon, defender: BattlePokemon, move: MoveData) {
    const category = move.category;

    // 급소 판정 (기본 1/24)
    const isCrit = Math.random() < 1 / 24;
    if (isCrit) {
        state.logs.push({ type: "info", message: `급소에 맞았다!` });
    }

    // 공격/방어 능력치 결정 (onStatCalc 적용됨)
    const atkStat =
        category === "special"
            ? calculateFinalStat(state, attacker, "spa")
            : calculateFinalStat(state, attacker, "atk");

    const defStat =
        category === "special"
            ? calculateFinalStat(state, defender, "spd")
            : calculateFinalStat(state, defender, "def");

    // 기본 상성 계산
    const isStab = attacker.data.types.includes(move.type as any);
    const typeMult = calculateTypeMultiplier(move.type, defender.data.types, TYPE_MATCHUPS as any);

    // onDamageCalc (예: 특성 '부풀린가슴' 등 보정치)
    const context = { damageMod: isCrit ? 1.5 : 1.0, move, isCrit };
    executeEffects(state, attacker, "onDamageCalc", context);
    executeEffects(state, defender, "onDamageCalc", context);

    const baseDmg = calculateBaseDamage(attacker.level, move.power || 0, atkStat, defStat);
    const rolls = calculateDamageRolls(baseDmg, (isStab ? 1.5 : 1.0) * context.damageMod, typeMult);
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
    state.logs.push({
        type: "damage",
        message: `${defenderSide.name}의 ${defender.data.nameKo}에게 ${damage}의 데미지!`,
    });

    if (typeMult > 1) state.logs.push({ type: "info", message: `효과가 굉장했다!` });
    else if (typeMult < 1 && typeMult > 0) state.logs.push({ type: "info", message: `효과가 별로인 듯하다...` });
    else if (typeMult === 0) state.logs.push({ type: "info", message: `효과가 없는 것 같다.` });

    if (defender.currentHp <= 0) {
        defender.isFainted = true;
        state.logs.push({ type: "faint", message: `${defenderSide.name}의 ${defender.data.nameKo}은(는) 쓰러졌다!` });
        executeEffects(state, defender, "onFaint");
    }
}

/**
 * 배틀 종료 조건을 체크합니다.
 */
function checkWinCondition(state: BattleState) {
    const playerAllFainted = state.player.team.every((p) => p.isFainted);
    const opponentAllFainted = state.opponent.team.every((p) => p.isFainted);

    if (opponentAllFainted) {
        state.isFinished = true;
        state.winner = "player";
        state.logs.push({ type: "win", message: `상대의 포켓몬이 모두 쓰러졌다! 당신의 승리!` });
    } else if (playerAllFainted) {
        state.isFinished = true;
        state.winner = "opponent";
        state.logs.push({ type: "win", message: `당신의 포켓몬이 모두 쓰러졌다! 당신의 패배...` });
    }
}
