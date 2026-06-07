import { describe, it, expect, beforeEach } from 'bun:test';
import { executeTurn } from '../../src/features/battle-ai/engine.js';
import type { BattleState, BattleAction, BattlePokemon } from '../../src/features/battle-ai/types.js';

// 테스트용 모의 데이터 생성 함수
const createMockPokemon = (id: number, name: string, types: string[], spe: number, hp: number): BattlePokemon => ({
    pokemonId: id,
    data: { id, nameKo: name, nameEn: name.toLowerCase(), types, stats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 } } as any,
    currentHp: hp,
    maxHp: hp,
    level: 50,
    calculatedStats: { hp, atk: 100, def: 100, spa: 100, spd: 100, spe },
    ranks: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
    moves: [
        { id: 1, nameKo: '몸통박치기', power: 40, type: 'normal', category: 'physical', priority: 0 } as any
    ],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    natureId: 0,
    moveIds: [1],
    isFainted: false,
    effectTags: [],
    abilityId: 0,
    itemId: 0
});

describe('Battle Engine Integration Tests (Refactored)', () => {
    let initialState: BattleState;

    beforeEach(() => {
        initialState = {
            player: {
                name: 'Player',
                team: [
                    createMockPokemon(1, '피카츄', ['electric'], 100, 100),
                    createMockPokemon(2, '라이츄', ['electric'], 110, 100)
                ],
                activeIdx: 0
            },
            opponent: {
                name: 'AI',
                team: [
                    createMockPokemon(3, '파이리', ['fire'], 80, 100)
                ],
                activeIdx: 0
            },
            turn: 1,
            logs: [],
            isFinished: false
        };
    });

    it('should determine turn order by speed when priorities are equal', () => {
        const playerAction: BattleAction = { type: 'move', side: 'player', moveIdx: 0 };
        const opponentAction: BattleAction = { type: 'move', side: 'opponent', moveIdx: 0 };

        const nextState = executeTurn(initialState, playerAction, opponentAction);

        // 피카츄(100)가 파이리(80)보다 빠르므로 로그의 첫 번째 공격은 피카츄여야 함
        expect(nextState.logs[0]!.message).toContain('Player의 피카츄! 몸통박치기 사용!');
    });

    it('should execute switch first regardless of speed', () => {
        const playerAction: BattleAction = { type: 'switch', side: 'player', switchIdx: 1 };
        const opponentAction: BattleAction = { type: 'move', side: 'opponent', moveIdx: 0 };

        const nextState = executeTurn(initialState, playerAction, opponentAction);

        // 교체 로그가 먼저 나와야 함
        expect(nextState.logs[0]!.message).toContain('Player은(는) 피카츄을(를) 불러들이고 라이츄을(를) 내보냈다!');
        expect(nextState.player.activeIdx).toBe(1);
    });

    it('should reduce HP when a damaging move is used', () => {
        const playerAction: BattleAction = { type: 'move', side: 'player', moveIdx: 0 };
        const opponentAction: BattleAction = { type: 'move', side: 'opponent', moveIdx: 0 };

        const nextState = executeTurn(initialState, playerAction, opponentAction);

        expect(nextState.opponent.team[0]!.currentHp).toBeLessThan(100);
        expect(nextState.player.team[0]!.currentHp).toBeLessThan(100);
    });

    it('should handle fainting correctly', () => {
        // 상대 파이리의 체력을 1로 설정
        initialState.opponent.team[0]!.currentHp = 1;

        const playerAction: BattleAction = { type: 'move', side: 'player', moveIdx: 0 };
        const opponentAction: BattleAction = { type: 'move', side: 'opponent', moveIdx: 0 };

        const nextState = executeTurn(initialState, playerAction, opponentAction);

        expect(nextState.opponent.team[0]!.isFainted).toBe(true);
        expect(nextState.opponent.team[0]!.currentHp).toBe(0);
        expect(nextState.isFinished).toBe(true); // 모든 포켓몬 기절 시 종료
        expect(nextState.winner).toBe('player');
    });

    it('should not allow fainted pokemon to use moves', () => {
        initialState.player.team[0]!.isFainted = true;
        initialState.player.team[0]!.currentHp = 0;

        const playerAction: BattleAction = { type: 'move', side: 'player', moveIdx: 0 };
        const opponentAction: BattleAction = { type: 'move', side: 'opponent', moveIdx: 0 };

        const nextState = executeTurn(initialState, playerAction, opponentAction);

        // 피카츄는 공격하지 못하고 파이리만 공격해야 함
        const attackLogs = nextState.logs.filter(l => l.message.includes('사용!'));
        expect(attackLogs.length).toBe(1);
        expect(attackLogs[0]!.message).toContain('AI의 파이리');
    });
});
