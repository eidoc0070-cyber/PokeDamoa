import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { MoveData, PokemonData } from "../../src/data/pokeapi.js";
import { executeTurn } from "../../src/features/battle-ai/engine.js";
import type { BattlePokemon, BattleState, EffectTag } from "../../src/features/battle-ai/types.js";

const dummyPokemonData: PokemonData = {
    id: 1,
    speciesId: 1,
    dexNumber: 1,
    nameKo: "테스트몬",
    nameEn: "Testmon",
    searchKey: "testmon",
    types: ["normal"],
    typesPast: [],
    stats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    statsPast: [],
    abilities: [{ id: 1, isHidden: false }],
    abilitiesPast: [],
    genId: 9,
    captureRate: 45,
    isDefault: true,
    encounters: [],
    learnsets: {},
};

const dummyMove: MoveData = {
    id: 1,
    nameKo: "몸통박치기",
    nameEn: "Tackle",
    searchKey: "tackle",
    power: 40,
    pp: 35,
    accuracy: 100,
    type: "normal",
    category: "physical",
    changelog: [],
};

function createTestPokemon(name: string, overrides: Partial<BattlePokemon> = {}): BattlePokemon {
    return {
        pokemonId: 1,
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        natureId: 0,
        abilityId: 1,
        itemId: 0,
        data: { ...dummyPokemonData, nameKo: name },
        currentHp: 200,
        maxHp: 200,
        calculatedStats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
        ranks: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
        moves: [dummyMove],
        moveIds: [1],
        isFainted: false,
        effectTags: [],
        ...overrides,
    };
}

describe("Advanced Battle Engine Tests", () => {
    let randomSpy: any;

    beforeEach(() => {
        randomSpy = spyOn(Math, "random").mockReturnValue(0.5);
    });

    afterEach(() => {
        randomSpy?.mockRestore();
    });

    describe("Turn Order & Priority", () => {
        it("Switch should have higher priority than moves", () => {
            const playerPoke = createTestPokemon("Player", {
                calculatedStats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 10 },
            }); // Slow
            const opponentPoke = createTestPokemon("Opponent", {
                calculatedStats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
            }); // Fast

            const state: BattleState = {
                player: { name: "Player", team: [playerPoke, createTestPokemon("Ally")], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            // Player switches, Opponent moves
            // Switching is priority 1000, Tackle is priority 0. Switch must happen first.
            const nextState = executeTurn(
                state,
                { type: "switch", side: "player", switchIdx: 1 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            expect(nextState.player.activeIdx).toBe(1);
            // Log check: Switch should appear before damage
            const switchLogIdx = nextState.logs.findIndex((l) => l.type === "switch");
            const damageLogIdx = nextState.logs.findIndex((l) => l.type === "damage");
            expect(switchLogIdx).toBeLessThan(damageLogIdx);
        });

        it("Higher priority move should go first regardless of speed", () => {
            const quickAttack: MoveData = { ...dummyMove, nameKo: "전광석화", priority: 1 };
            const playerPoke = createTestPokemon("Player", {
                calculatedStats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 10 },
                moves: [quickAttack],
            });
            const opponentPoke = createTestPokemon("Opponent", {
                calculatedStats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
            });

            const state: BattleState = {
                player: { name: "Player", team: [playerPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Player uses priority 1, Opponent uses priority 0. Player goes first.
            const playerLogIdx = nextState.logs.findIndex((l) => l.message.includes("전광석화 사용"));
            const opponentLogIdx = nextState.logs.findIndex((l) => l.message.includes("몸통박치기 사용"));
            expect(playerLogIdx).toBeGreaterThan(-1);
            expect(opponentLogIdx).toBeGreaterThan(-1);
            expect(playerLogIdx).toBeLessThan(opponentLogIdx);
        });
    });

    describe("Move Effects & Hooks", () => {
        it("should cancel move if onBeforeMove sets cancel flag (Flinch/Paralysis)", () => {
            const flinchTag: EffectTag = {
                id: "flinch",
                trigger: "onBeforeMove",
                action: "prevent_action",
                params: { message: "{name}은(는) 풀이 죽어 움직일 수 없다!" },
                target: "self",
                priority: 0,
                sourceType: "system",
            };

            const playerPoke = createTestPokemon("Player", { effectTags: [flinchTag] });
            const opponentPoke = createTestPokemon("Opponent");

            const state: BattleState = {
                player: { name: "Player", team: [playerPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Player's move should be cancelled
            expect(nextState.logs.some((l) => l.message.includes("풀이 죽어 움직일 수 없다"))).toBe(true);
            expect(
                nextState.logs.some(
                    (l) => l.message.includes("전광석화 사용") || l.message.includes("몸통박치기 사용"),
                ),
            ).toBe(true);
            // Wait, Opponent should move. Player should NOT have "사용" log for their move.
            const playerMoveLog = nextState.logs.some(
                (l) => l.message.includes("Player") && l.message.includes("사용"),
            );
            expect(playerMoveLog).toBe(false);
            const opponentMoveLog = nextState.logs.some(
                (l) => l.message.includes("Opponent") && l.message.includes("사용"),
            );
            expect(opponentMoveLog).toBe(true);
        });

        it("should handle multiple effects in order of priority", () => {
            const lowPrioTag: EffectTag = {
                id: "low",
                trigger: "onTurnEnd",
                action: "damage",
                params: { percent: 10 },
                target: "self",
                priority: 1,
                sourceType: "system",
            };
            const highPrioTag: EffectTag = {
                id: "high",
                trigger: "onTurnEnd",
                action: "heal",
                params: { percent: 10 },
                target: "self",
                priority: 10,
                sourceType: "system",
            };

            const playerPoke = createTestPokemon("Player", { effectTags: [lowPrioTag, highPrioTag], currentHp: 100 });
            const state: BattleState = {
                player: { name: "Player", team: [playerPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [createTestPokemon("Opponent")], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // High priority (heal) should happen before low priority (damage)
            const healLogIdx = nextState.logs.findIndex((l) => l.message.includes("회복되었다"));
            const damageLogIdx = nextState.logs.findIndex((l) => l.message.includes("데미지를 입었다"));
            expect(healLogIdx).toBeGreaterThan(-1);
            expect(damageLogIdx).toBeGreaterThan(-1);
            expect(healLogIdx).toBeLessThan(damageLogIdx);
        });
        it("should execute secondary effects of attacking moves", () => {
            const secondaryEffect: EffectTag = {
                id: "burn_chance",
                trigger: "onAfterMove",
                action: "apply_status",
                params: { status: "burn" },
                target: "opponent",
                priority: 0,
                sourceType: "move",
            };

            const burnMove: MoveData = {
                ...dummyMove,
                nameKo: "불꽃세례",
                power: 40,
                effectTags: [secondaryEffect] as any,
            };

            const playerPoke = createTestPokemon("Player", { moves: [burnMove] });
            const opponentPoke = createTestPokemon("Opponent");

            const state: BattleState = {
                player: { name: "Player", team: [playerPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Opponent should be burned
            expect(nextState.opponent.team[0]!.status).toBe("burn");
            expect(nextState.logs.some((l) => l.message.includes("burn 상태가 되었다"))).toBe(true);
        });

        it("Burn status should reduce physical attack damage by 50%", () => {
            const playerPoke = createTestPokemon("Player", { status: "burn" });
            const opponentPoke = createTestPokemon("Opponent");

            const statusData = {
                burn: {
                    nameKo: "화상",
                    effectTags: [
                        {
                            id: "burn_atk_penalty",
                            trigger: "onDamageCalc",
                            condition: "move_category == physical",
                            action: "modify_damage",
                            params: { multiplier: 0.5 },
                            target: "self",
                            priority: 10,
                            sourceType: "system",
                        },
                    ],
                },
            };

            const state: BattleState = {
                player: { name: "Player", team: [playerPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
                statusData: statusData as any,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Log damage for burn vs non-burn (Need a baseline)
            const playerPokeNormal = createTestPokemon("Player");
            const stateNormal: BattleState = {
                player: { name: "Player", team: [playerPokeNormal], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
                statusData: statusData as any,
            };
            const nextStateNormal = executeTurn(
                stateNormal,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            const burnDmgLog = nextState.logs.find((l) => l.type === "damage" && l.message.includes("Opponent"));
            const normalDmgLog = nextStateNormal.logs.find(
                (l) => l.type === "damage" && l.message.includes("Opponent"),
            );

            const burnDmg = parseInt(burnDmgLog!.message.match(/\d+/)![0], 10);
            const normalDmg = parseInt(normalDmgLog!.message.match(/\d+/)![0], 10);

            // Burn damage should be roughly half (ignoring slight random variance which is 85-100%)
            // 0.85 * normal / 2 vs 1.0 * normal / 2
            expect(burnDmg).toBeLessThan(normalDmg * 0.7); // Safe margin to account for 85-100% roll
        });
        it("should execute secondary rank-up effects of attacking moves", () => {
            const secondaryRankTag: EffectTag = {
                id: "atk_up_chance",
                trigger: "onAfterMove",
                action: "modify_rank",
                params: { stat: "atk", stage: 1 },
                target: "self",
                priority: 0,
                sourceType: "move",
            };

            const attackAndBoostMove: MoveData = {
                ...dummyMove,
                nameKo: "니트로차지",
                power: 50,
                effectTags: [secondaryRankTag] as any,
            };

            const playerPoke = createTestPokemon("Player", { moves: [attackAndBoostMove] });
            const opponentPoke = createTestPokemon("Opponent");

            const state: BattleState = {
                player: { name: "Player", team: [playerPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Player should have +1 Atk rank
            expect(nextState.player.team[0]!.ranks.atk).toBe(1);
            expect(nextState.logs.some((l) => l.message.includes("atk이(가) 올랐다"))).toBe(true);
        });
    });

    describe("Faint Handling", () => {
        it("should not allow fainted pokemon to move", () => {
            // Player has 2 pokemon, so battle doesn't end immediately when one is fainted
            const faintedPoke = createTestPokemon("Fainted", { isFainted: true, currentHp: 0 });
            const healthyPoke = createTestPokemon("Healthy");
            const opponentPoke = createTestPokemon("Opponent");

            const state: BattleState = {
                player: { name: "Player", team: [faintedPoke, healthyPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
            };

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Fainted pokemon should not have "사용" log
            const faintedMoveLog = nextState.logs.some(
                (l) => l.message.includes("Fainted") && l.message.includes("사용"),
            );
            expect(faintedMoveLog).toBe(false);
            // Opponent should still move
            const opponentMoveLog = nextState.logs.some(
                (l) => l.message.includes("Opponent") && l.message.includes("사용"),
            );
            expect(opponentMoveLog).toBe(true);
        });
    });
});
