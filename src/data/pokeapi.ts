import type { PokemonType } from './constants.js';

export interface PokemonData {
    id: number;
    speciesId: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    types: PokemonType[];
    stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
    genId: number;
    captureRate: number;
    isDefault: boolean;
    encounters: { genId: number; versionName: string; locations: string[] }[];
}

export interface MoveData {
    id: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    power: number;
    type: PokemonType;
    category: 'status' | 'physical' | 'special';
}

let cachedData: PokemonData[] | null = null;
let cachedMovesData: MoveData[] | null = null;

/**
 * 사전 빌드된 /pokedex-data.json 정적 파일을 가져옵니다.
 * 이 구조는 클라이언트 부하를 최소화하고 PWA 캐싱을 매우 쉽게 만듭니다.
 */
export async function fetchPokedexData(): Promise<PokemonData[]> {
    if (cachedData) return cachedData;
    
    try {
        const response = await fetch('/pokedex-data.json');
        if (!response.ok) throw new Error('Failed to fetch pokedex data');
        const data = await response.json();
        
        cachedData = data;
        return data as PokemonData[];
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
        const data = await response.json();
        
        // 정렬: 이름순 (선택사항, 하지만 검색을 위해 그냥 캐싱함)
        cachedMovesData = data;
        return data as MoveData[];
    } catch (e) {
        console.error('기술 데이터 로드 실패:', e);
        return [];
    }
}
