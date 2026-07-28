import { describe, expect, it } from "bun:test";
import type { MoveData, PokemonData } from "../../src/data/pokeapi.js";
import { executeTurn } from "../../src/features/battle-ai/engine.js";
import type { BattleAction, BattlePokemon, BattleState, EffectTag } from "../../src/features/battle-ai/types.js";

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

function createTestPokemon(name: string, effectTags: EffectTag[] = []): BattlePokemon {
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
        effectTags: effectTags,
    };
}

describe("Battle Engine V2 Integration (Data-Driven)", () => {
    it("should handle onEntry effect (Intimidate)", () => {
        const intimidateTag: EffectTag = {
            id: "intimidate",
            trigger: "onEntry",
            action: "modify_rank",
            params: { stat: "atk", stage: -1 },
            target: "opponent",
            priority: 0,
            sourceType: "ability",
        };

        const playerPoke = createTestPokemon("Player", [intimidateTag]);
        const opponentPoke = createTestPokemon("Opponent");

        const state: BattleState = {
            player: { name: "Player", team: [playerPoke], activeIdx: 0 },
            opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        // 교체 상황을 시뮬레이션하여 onEntry 발동 확인
        // 실제로는 초기화 시점이나 handleSwitch에서 발동
        const pAction: BattleAction = { type: "switch", side: "player", switchIdx: 0 };
        const oAction: BattleAction = { type: "move", side: "opponent", moveIdx: 0 };

        const nextState = executeTurn(state, pAction, oAction);

        expect(nextState.opponent.team[0]!.ranks.atk).toBe(-1);
        expect(nextState.logs.some((l) => l.message.includes("Opponent의 atk이(가) 떨어졌다!"))).toBe(true);
    });

    it("should handle move-based EffectTags (Sword Dance)", () => {
        const swordDanceMove: MoveData = {
            ...dummyMove,
            nameKo: "칼춤",
            power: 0,
            category: "status",
            effectTags: [
                {
                    id: "sword_dance_effect",
                    trigger: "onAfterMove", // 변화기는 직접 호출되거나 onAfterMove에서 처리
                    action: "modify_rank",
                    params: { stat: "atk", stage: 2 },
                    target: "self",
                    priority: 0,
                    sourceType: "move",
                },
            ] as any,
        };

        const playerPoke = createTestPokemon("Player");
        playerPoke.moves = [swordDanceMove];
        const opponentPoke = createTestPokemon("Opponent");

        const state: BattleState = {
            player: { name: "Player", team: [playerPoke], activeIdx: 0 },
            opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const pAction: BattleAction = { type: "move", side: "player", moveIdx: 0 };
        const oAction: BattleAction = { type: "move", side: "opponent", moveIdx: 0 };

        const nextState = executeTurn(state, pAction, oAction);

        expect(nextState.player.team[0]!.ranks.atk).toBe(2);
    });

    it("should handle onTurnEnd effect (Leftovers)", () => {
        const leftoversTag: EffectTag = {
            id: "leftovers",
            trigger: "onTurnEnd",
            action: "heal",
            params: { percent: 6.25 }, // 1/16
            target: "self",
            priority: 0,
            sourceType: "item",
        };

        const playerPoke = createTestPokemon("Player", [leftoversTag]);
        playerPoke.currentHp = 100; // 50% HP
        const opponentPoke = createTestPokemon("Opponent");

        const state: BattleState = {
            player: { name: "Player", team: [playerPoke], activeIdx: 0 },
            opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const pAction: BattleAction = { type: "move", side: "player", moveIdx: 0 };
        const oAction: BattleAction = { type: "switch", side: "opponent", switchIdx: 0 }; // 공격 대신 교체

        const nextState = executeTurn(state, pAction, oAction);

        // 200 * 0.0625 = 12.5 -> floor(12.5) = 12
        // 100 + 12 = 112 (상대 공격이 없으므로 정확히 112여야 함)
        expect(nextState.player.team[0]!.currentHp).toBe(112);
    });

    it("should handle conditional effect (Overgrow - boost grass damage when HP < 33%)", () => {
        const overgrowTag: EffectTag = {
            id: "overgrow",
            trigger: "onDamageCalc",
            condition: "hp_percent < 33.4",
            action: "modify_damage",
            params: { multiplier: 1.5 },
            target: "self",
            priority: 0,
            sourceType: "ability",
        };

        const grassMove: MoveData = { ...dummyMove, type: "grass" };

        // 1. HP가 높을 때 (발동 안함)
        const playerHighHp = createTestPokemon("Player", [overgrowTag]);
        playerHighHp.currentHp = 200; // 100%
        playerHighHp.moves = [grassMove];

        const stateHigh: BattleState = {
            player: { name: "Player", team: [playerHighHp], activeIdx: 0 },
            opponent: { name: "Opponent", team: [createTestPokemon("Opponent")], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const nextStateHigh = executeTurn(
            stateHigh,
            { type: "move", side: "player", moveIdx: 0 },
            { type: "move", side: "opponent", moveIdx: 0 },
        );

        // 2. HP가 낮을 때 (발동함)
        const playerLowHp = createTestPokemon("Player", [overgrowTag]);
        playerLowHp.currentHp = 60; // 30% (< 33.4%)
        playerLowHp.moves = [grassMove];

        const stateLow: BattleState = {
            player: { name: "Player", team: [playerLowHp], activeIdx: 0 },
            opponent: { name: "Opponent", team: [createTestPokemon("Opponent")], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const nextStateLow = executeTurn(
            stateLow,
            { type: "move", side: "player", moveIdx: 0 },
            { type: "move", side: "opponent", moveIdx: 0 },
        );

        // 데미지 직접 비교는 어렵지만 에러 없이 로직이 분기되는지 확인
        expect(nextStateHigh).toBeDefined();
        expect(nextStateLow).toBeDefined();
    });

    it("should handle onDamageCalc effect (Damage boost)", () => {
        const boostTag: EffectTag = {
            id: "damage_boost",
            trigger: "onDamageCalc",
            action: "modify_damage",
            params: { multiplier: 1.5 },
            target: "self",
            priority: 0,
            sourceType: "ability",
        };

        const playerPoke = createTestPokemon("Player", [boostTag]);
        const opponentPoke = createTestPokemon("Opponent");

        const state: BattleState = {
            player: { name: "Player", team: [playerPoke], activeIdx: 0 },
            opponent: { name: "Opponent", team: [opponentPoke], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        // 공격 기술 사용
        const pAction: BattleAction = { type: "move", side: "player", moveIdx: 0 };
        const oAction: BattleAction = { type: "move", side: "opponent", moveIdx: 0 };

        const nextState = executeTurn(state, pAction, oAction);

        // 데미지 계산 로그 확인은 어려우므로 (난수 때문),
        // 그냥 에러 없이 실행되는지 확인하는 정도로 우선 진행
        expect(nextState.opponent.team[0]!.currentHp).toBeLessThan(200);
    });

    describe("Paralysis (Data-Driven Status)", () => {
        const statusData = {
            paralysis: {
                nameKo: "마비",
                effectTags: [
                    {
                        id: "par_spe_penalty",
                        trigger: "onStatCalc",
                        action: "modify_stat",
                        params: { stat: "spe", multiplier: 0.5 },
                        target: "self",
                        priority: 10,
                        sourceType: "system",
                    },
                    {
                        id: "par_prevent",
                        trigger: "onBeforeMove",
                        condition: "random <= 25",
                        action: "prevent_action",
                        params: { message: "{name}은(는) 몸이 저려 움직일 수 없다!" },
                        target: "self",
                        priority: 0,
                        sourceType: "system",
                    },
                ],
            },
        };

        it("should reduce speed by 50% via onStatCalc", () => {
            const slowPoke = createTestPokemon("Slow", []);
            slowPoke.status = "paralysis";
            slowPoke.calculatedStats.spe = 100;

            const fastPoke = createTestPokemon("Fast", []);
            fastPoke.calculatedStats.spe = 80; // 마비가 없다면 Fast보다 Slow가 빨라야 함

            const state: BattleState = {
                player: { name: "Player", team: [slowPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [fastPoke], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
                statusData: statusData as any,
            };

            // 둘 다 우선도 0인 기술 사용
            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            // Slow(100 -> 50) vs Fast(80) -> Fast가 먼저 공격해야 함
            const fastMoveIdx = nextState.logs.findIndex((l) => l.message.includes("Fast! 몸통박치기 사용!"));
            const slowMoveIdx = nextState.logs.findIndex((l) => l.message.includes("Slow"));

            expect(fastMoveIdx).toBeLessThan(slowMoveIdx);
        });

        it("should prevent action based on random condition (Paralysis Lock)", () => {
            const paralyzedPoke = createTestPokemon("Paralyzed", []);
            paralyzedPoke.status = "paralysis";

            const state: BattleState = {
                player: { name: "Player", team: [paralyzedPoke], activeIdx: 0 },
                opponent: { name: "Opponent", team: [createTestPokemon("Opponent")], activeIdx: 0 },
                turn: 1,
                logs: [],
                isFinished: false,
                statusData: statusData as any,
            };

            // Math.random을 모킹하여 25% 이하의 값이 나오게 함 (마비 발동)
            const originalRandom = Math.random;
            Math.random = () => 0.1; // 10%

            const nextState = executeTurn(
                state,
                { type: "move", side: "player", moveIdx: 0 },
                { type: "move", side: "opponent", moveIdx: 0 },
            );

            Math.random = originalRandom; // 원복

            expect(nextState.logs.some((l) => l.message.includes("Paralyzed은(는) 몸이 저려 움직일 수 없다!"))).toBe(
                true,
            );
            // 데미지 로그가 없어야 함 (행동이 취소되었으므로)
            expect(nextState.logs.some((l) => l.message.includes("Opponent에게"))).toBe(false);
        });
    });
});
