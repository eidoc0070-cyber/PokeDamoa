import type { PokemonType } from './constants.js';
import { getFromDB, saveToDB } from '../utils/storage-db.js';

export interface PokemonData {
    id: number;
    speciesId: number;
    dexNumber: number;
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

async function checkVersion(): Promise<boolean> {
    try {
        const response = await fetch('/version.json');
        if (!response.ok) return false;
        const { version } = await response.json();
        const localVersion = await getFromDB<number>('data_version');
        
        if (version === localVersion) {
            return true;
        } else {
            await saveToDB('data_version', version);
            return false;
        }
    } catch {
        return false;
    }
}

async function smartFetch<T>(key: string, url: string, isVersionMatch: boolean): Promise<T[]> {
    if (isVersionMatch) {
        const localData = await getFromDB<T[]>(key);
        if (localData) return localData;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const data = await response.json();
    await saveToDB(key, data);
    return data;
}

let versionMatchPromise: Promise<boolean> | null = null;

async function getIsVersionMatch() {
    if (!versionMatchPromise) {
        versionMatchPromise = checkVersion();
    }
    return versionMatchPromise;
}

/**
 * 사전 빌드된 /pokedex-data.json 정적 파일을 가져옵니다. (IndexedDB 캐싱 활용)
 */
export async function fetchPokedexData(): Promise<PokemonData[]> {
    if (cachedData) return cachedData;
    try {
        const isMatch = await getIsVersionMatch();
        cachedData = await smartFetch<PokemonData>('pokedex_data', '/pokedex-data.json', isMatch);
        return cachedData;
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
        const isMatch = await getIsVersionMatch();
        cachedMovesData = await smartFetch<MoveData>('moves_data', '/moves-data.json', isMatch);
        return cachedMovesData;
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
        const isMatch = await getIsVersionMatch();
        cachedAbilitiesData = await smartFetch<AbilityData>('abilities_data', '/abilities-data.json', isMatch);
        return cachedAbilitiesData;
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
        const isMatch = await getIsVersionMatch();
        cachedItemsData = await smartFetch<ItemData>('items_data', '/items-data.json', isMatch);
        return cachedItemsData;
    } catch (e) {
        console.error('아이템 데이터 로드 실패:', e);
        return [];
    }
}

/**
 * 캐시된 데이터를 외부(window.PokeApp 등)에서 조회할 수 있도록 반환합니다.
 */
export function getLoadedData() {
    return {
        pokemon: cachedData,
        moves: cachedMovesData,
        abilities: cachedAbilitiesData,
        items: cachedItemsData
    };
}
