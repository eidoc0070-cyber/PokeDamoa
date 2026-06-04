import type { PokemonSlot } from '../party-builder/types.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';

export type AILevel = 'beginner' | 'normal' | 'expert';

export interface BattleStats {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
}

export interface BattlePokemon extends PokemonSlot {
    data: PokemonData;
    currentHp: number;
    maxHp: number;
    calculatedStats: BattleStats;
    ranks: {
        atk: number;
        def: number;
        spa: number;
        spd: number;
        spe: number;
        accuracy: number;
        evasion: number;
    };
    moves: MoveData[];
    status?: string | null;
    isFainted: boolean;
}

export interface BattleSide {
    name: string;
    team: BattlePokemon[];
    activeIdx: number; // 현재 나와있는 포켓몬의 인덱스
}

export interface BattleLog {
    type: 'info' | 'damage' | 'faint' | 'switch' | 'win';
    message: string;
}

export interface BattleState {
    player: BattleSide;
    opponent: BattleSide;
    turn: number;
    logs: BattleLog[];
    isFinished: boolean;
    winner?: 'player' | 'opponent';
}

export interface BattleAction {
    type: 'move' | 'switch';
    side: 'player' | 'opponent';
    moveIdx?: number;
    switchIdx?: number;
}
