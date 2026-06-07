import type { PokemonSlot } from '../party-builder/types.js';
import type { PokemonData, MoveData } from '../../data/pokeapi.js';

export type AILevel = 'beginner' | 'normal' | 'expert';

export type EventHook = 
    | 'onEntry' 
    | 'onBeforeMove' 
    | 'onDamageCalc' 
    | 'onAfterMove' 
    | 'onTurnEnd' 
    | 'onFaint' 
    | 'onSwitchOut'
    | 'onStatCalc';

export type TargetType = 'self' | 'opponent' | 'ally' | 'field' | 'side' | 'all';

export type EffectAction = 
    | 'modify_rank' 
    | 'modify_stat' 
    | 'modify_damage' 
    | 'apply_status' 
    | 'heal' 
    | 'damage'
    | 'set_weather'
    | 'set_field'
    | 'prevent_action'
    | 'custom';

export interface EffectTag {
    id: string;
    trigger: EventHook;
    condition?: string;
    action: EffectAction;
    params: any;
    target: TargetType;
    priority: number;
    sourceType: 'ability' | 'item' | 'move' | 'system';
}

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
    abilityId?: number | null;
    itemId?: number | null;
    effectTags: EffectTag[]; // 활성화된 모든 효과 (특성, 도구, 기술 효과 등)
}

export interface BattleSide {
    name: string;
    team: BattlePokemon[];
    activeIdx: number;
}

export interface BattleLog {
    type: 'info' | 'damage' | 'faint' | 'switch' | 'win' | 'effect';
    message: string;
}

export interface StatusData {
    nameKo: string;
    effectTags: EffectTag[];
}

export interface BattleState {
    player: BattleSide;
    opponent: BattleSide;
    turn: number;
    weather?: string;
    field?: string;
    logs: BattleLog[];
    isFinished: boolean;
    winner?: 'player' | 'opponent';
    statusData?: Record<string, StatusData>; // 전역 상태이상 정의 데이터
}

export interface BattleAction {
    type: 'move' | 'switch';
    side: 'player' | 'opponent';
    moveIdx?: number;
    switchIdx?: number;
}
