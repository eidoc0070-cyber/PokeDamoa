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
    flavorText?: string;
    effectTags?: any[];
    priority?: number;
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
    flavorText?: string;
}

export interface ItemData {
    id: number;
    nameKo: string;
    nameEn: string;
    searchKey: string;
    effect: string;
    flavorText?: string;
    category: number;
}

let cachedData: PokemonData[] | null = null;
let cachedMovesData: MoveData[] | null = null;
let cachedAbilitiesData: AbilityData[] | null = null;
let cachedItemsData: ItemData[] | null = null;
let cachedStatusData: any = null;

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

    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        await saveToDB(key, data);
        return data;
    } catch {
        return [];
    }
}

async function fetchCustomData<T>(url: string): Promise<T[]> {
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        return await response.json();
    } catch {
        return [];
    }
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
 * custom-pokedex.json 데이터와 병합합니다.
 */
export async function fetchPokedexData(): Promise<PokemonData[]> {
    if (cachedData) return cachedData;
    try {
        const isMatch = await getIsVersionMatch();
        const baseData = await smartFetch<PokemonData>('pokedex_data', '/pokedex-data.json', isMatch);
        const customData = await fetchCustomData<PokemonData>('/custom-pokedex.json');
        
        // 커스텀 데이터가 우선순위를 가짐 (ID 충돌 시 커스텀 데이터로 덮어쓰기)
        const combined = [...baseData];
        customData.forEach(custom => {
            const index = combined.findIndex(p => p.id === custom.id);
            if (index !== -1) {
                combined[index] = custom;
            } else {
                combined.push(custom);
            }
        });

        cachedData = combined;
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
        const baseData = await smartFetch<MoveData>('moves_data', '/moves-data.json', isMatch);
        const customData = await fetchCustomData<MoveData>('/custom-moves.json');

        const combined = [...baseData];
        customData.forEach(custom => {
            const index = combined.findIndex(m => m.id === custom.id);
            if (index !== -1) {
                combined[index] = custom;
            } else {
                combined.push(custom);
            }
        });

        cachedMovesData = combined;
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
        const baseData = await smartFetch<AbilityData>('abilities_data', '/abilities-data.json', isMatch);
        const customData = await fetchCustomData<AbilityData>('/custom-abilities.json');

        const combined = [...baseData];
        customData.forEach(custom => {
            const index = combined.findIndex(a => a.id === custom.id);
            if (index !== -1) {
                combined[index] = custom;
            } else {
                combined.push(custom);
            }
        });

        cachedAbilitiesData = combined;
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
        const baseData = await smartFetch<ItemData>('items_data', '/items-data.json', isMatch);
        const customData = await fetchCustomData<ItemData>('/custom-items.json');

        const combined = [...baseData];
        customData.forEach(custom => {
            const index = combined.findIndex(i => i.id === custom.id);
            if (index !== -1) {
                combined[index] = custom;
            } else {
                combined.push(custom);
            }
        });

        cachedItemsData = combined;
        return cachedItemsData;
    } catch (e) {
        console.error('아이템 데이터 로드 실패:', e);
        return [];
    }
}

/**
 * 상태이상 데이터를 가져옵니다.
 */
export async function fetchStatusData(): Promise<any> {
    if (cachedStatusData) return cachedStatusData;
    try {
        const response = await fetch('/statuses-data.json');
        if (!response.ok) return {};
        cachedStatusData = await response.json();
        return cachedStatusData;
    } catch {
        return {};
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
