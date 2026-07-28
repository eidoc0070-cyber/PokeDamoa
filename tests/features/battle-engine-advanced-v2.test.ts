import { describe, expect, it } from "bun:test";
import type { MoveData, PokemonData } from "../../src/data/pokeapi.js";
import { executeTurn } from "../../src/features/battle-ai/engine.js";
import type { BattlePokemon, BattleState, EffectTag } from "../../src/features/battle-ai/types.js";

const dummyData: PokemonData = {
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
    abilities: [],
    abilitiesPast: [],
    genId: 9,
    captureRate: 45,
    isDefault: true,
    encounters: [],
    learnsets: {},
};

function createPoke(name: string, moves: MoveData[] = [], effectTags: EffectTag[] = []): BattlePokemon {
    return {
        pokemonId: 1,
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        natureId: 0,
        abilityId: 1,
        itemId: 0,
        data: { ...dummyData, nameKo: name },
        currentHp: 200,
        maxHp: 200,
        calculatedStats: { hp: 200, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
        ranks: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
        moves,
        moveIds: moves.map((m) => m.id),
        isFainted: false,
        effectTags,
    };
}

describe("Advanced Battle Engine V2 Mechanics (Accuracy, Drain, Recoil, Statuses)", () => {
    it("should handle drain effect correctly", () => {
        const drainMove: MoveData = {
            id: 10,
            nameKo: "드레인키스",
            nameEn: "Draining Kiss",
            searchKey: "drainingkiss",
            power: 50,
            pp: 10,
            accuracy: 100,
            type: "fairy",
            category: "special",
            changelog: [],
            effectTags: [
                {
                    id: "drain_50",
                    trigger: "onAfterMove",
                    action: "drain",
                    params: { percent: 50 },
                    target: "self",
                    priority: 0,
                    sourceType: "move",
                },
            ],
        };

        const attacker = createPoke("Attacker", [drainMove]);
        attacker.currentHp = 100; // injured
        const defender = createPoke("Defender", []);

        const state: BattleState = {
            player: { name: "Player", team: [attacker], activeIdx: 0 },
            opponent: { name: "Opponent", team: [defender], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const nextState = executeTurn(
            state,
            { type: "move", side: "player", moveIdx: 0 },
            { type: "move", side: "opponent", moveIdx: 0 },
        );

        const newAttacker = nextState.player.team[0]!;
        expect(newAttacker.currentHp).toBeGreaterThan(100);
        expect(nextState.logs.some((l) => l.message.includes("상대의 HP를 흡수했다!"))).toBe(true);
    });

    it("should handle recoil effect correctly", () => {
        const recoilMove: MoveData = {
            id: 11,
            nameKo: "돌진",
            nameEn: "Take Down",
            searchKey: "takedown",
            power: 90,
            pp: 20,
            accuracy: 85,
            type: "normal",
            category: "physical",
            changelog: [],
            effectTags: [
                {
                    id: "recoil_25",
                    trigger: "onAfterMove",
                    action: "recoil",
                    params: { percent: 25 },
                    target: "self",
                    priority: 0,
                    sourceType: "move",
                },
            ],
        };

        const attacker = createPoke("Attacker", [recoilMove]);
        const defender = createPoke("Defender", []);

        const state: BattleState = {
            player: { name: "Player", team: [attacker], activeIdx: 0 },
            opponent: { name: "Opponent", team: [defender], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const nextState = executeTurn(
            state,
            { type: "move", side: "player", moveIdx: 0 },
            { type: "move", side: "opponent", moveIdx: 0 },
        );

        const newAttacker = nextState.player.team[0]!;
        if (
            nextState.logs.some((l) => l.message.includes("돌진 사용!")) &&
            !nextState.logs.some((l) => l.message.includes("맞지 않았다!"))
        ) {
            expect(newAttacker.currentHp).toBeLessThan(200);
            expect(nextState.logs.some((l) => l.message.includes("반동 데미지를 입었다!"))).toBe(true);
        }
    });

    it("should handle status cure action", () => {
        const cureMove: MoveData = {
            id: 12,
            nameKo: "리프레쉬",
            nameEn: "Refresh",
            searchKey: "refresh",
            power: 0,
            pp: 20,
            accuracy: 100,
            type: "normal",
            category: "status",
            changelog: [],
            effectTags: [
                {
                    id: "cure_st",
                    trigger: "onAfterMove",
                    action: "cure_status",
                    params: {},
                    target: "self",
                    priority: 0,
                    sourceType: "move",
                },
            ],
        };

        const p = createPoke("CuredPoke", [cureMove]);
        p.status = "burn";

        const state: BattleState = {
            player: { name: "Player", team: [p], activeIdx: 0 },
            opponent: { name: "Opponent", team: [createPoke("Dummy")], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
        };

        const nextState = executeTurn(
            state,
            { type: "move", side: "player", moveIdx: 0 },
            { type: "move", side: "opponent", moveIdx: 0 },
        );

        expect(nextState.player.team[0]!.status).toBeNull();
        expect(nextState.logs.some((l) => l.message.includes("상태가 회복되었다!"))).toBe(true);
    });

    it("should handle poison dot damage on turn end", () => {
        const poisoned = createPoke("Poisoned", []);
        poisoned.status = "poison";

        const statusData = {
            poison: {
                nameKo: "독",
                effectTags: [
                    {
                        id: "psn_dot",
                        trigger: "onTurnEnd",
                        action: "damage",
                        params: { percent: 12.5 },
                        target: "self",
                        priority: 0,
                        sourceType: "system",
                    },
                ],
            },
        };

        const state: BattleState = {
            player: { name: "Player", team: [poisoned], activeIdx: 0 },
            opponent: { name: "Opponent", team: [createPoke("Dummy")], activeIdx: 0 },
            turn: 1,
            logs: [],
            isFinished: false,
            statusData: statusData as any,
        };

        const nextState = executeTurn(
            state,
            { type: "switch", side: "player", switchIdx: 0 },
            { type: "switch", side: "opponent", switchIdx: 0 },
        );

        // 200 * 0.125 = 25 damage -> 175 HP
        expect(nextState.player.team[0]!.currentHp).toBe(175);
    });
});
