import type { PokemonType } from './constants.js';

export interface PokemonData {
    id: number;
    speciesId: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    types: PokemonType[];
    typesPast: { genId: number; types: PokemonType[] }[];
    stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
    statsPast: { genId: number; stats: any }[];
    abilities: { id: number; isHidden: boolean }[];
    abilitiesPast: { genId: number; abilities: { id: number; isHidden: boolean }[] }[];
    genId: number;
    captureRate: number;
    isDefault: boolean;
    encounters: { genId: number; versionName: string; locations: string[] }[];
    learnsets: Record<number, number[]>;
}

export interface MoveData {
    id: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    power: number;
    pp: number;
    accuracy: number;
    type: PokemonType;
    category: 'status' | 'physical' | 'special';
    effect?: string;
    changelog: { 
        genId: number; 
        power: number | null; 
        pp: number | null; 
        accuracy: number | null; 
        type: PokemonType | null 
    }[];
}

export interface AbilityData {
    id: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    effect: string;
}

export interface ItemData {
    id: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    effect: string;
    category: number;
}

let cachedData: PokemonData[] | null = null;
let cachedMovesData: MoveData[] | null = null;
let cachedAbilitiesData: AbilityData[] | null = null;
let cachedItemsData: ItemData[] | null = null;

/**
 * 사전 빌드된 /pokedex-data.json 정적 파일을 가져옵니다.
 */
export async function fetchPokedexData(): Promise<PokemonData[]> {
    if (cachedData) return cachedData;
    try {
        const response = await fetch('/pokedex-data.json');
        if (!response.ok) throw new Error('Failed to fetch pokedex data');
        cachedData = await response.json();
        return cachedData!;
    } catch (e) {
        console.error('도감 데이터 로드 실패:', e);
        return [];
    }
}

/**
 * 사전 빌드된 /moves-data.json 정적 파일을 가져옵니다.
 */
export async function fetchMovesData(): Promise<MoveData[]> {
    if (cachedMovesData) return cachedMovesData;
    try {
        const response = await fetch('/moves-data.json');
        if (!response.ok) throw new Error('Failed to fetch moves data');
        cachedMovesData = await response.json();
        return cachedMovesData!;
    } catch (e) {
        console.error('기술 데이터 로드 실패:', e);
        return [];
    }
}

/**
 * 사전 빌드된 /abilities-data.json 정적 파일을 가져옵니다.
 */
export async function fetchAbilitiesData(): Promise<AbilityData[]> {
    if (cachedAbilitiesData) return cachedAbilitiesData;
    try {
        const response = await fetch('/abilities-data.json');
        if (!response.ok) throw new Error('Failed to fetch abilities data');
        cachedAbilitiesData = await response.json();
        return cachedAbilitiesData!;
    } catch (e) {
        console.error('특성 데이터 로드 실패:', e);
        return [];
    }
}

/**
 * 사전 빌드된 /items-data.json 정적 파일을 가져옵니다.
 */
export async function fetchItemsData(): Promise<ItemData[]> {
    if (cachedItemsData) return cachedItemsData;
    try {
        const response = await fetch('/items-data.json');
        if (!response.ok) throw new Error('Failed to fetch items data');
        cachedItemsData = await response.json();
        return cachedItemsData!;
    } catch (e) {
        console.error('아이템 데이터 로드 실패:', e);
        return [];
    }
}
