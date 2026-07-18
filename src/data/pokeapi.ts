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
        const baseData = await smartFetch<PokemonData>('pokedex_data', '/data/pokedex-data.json', isMatch);
        const customData = await fetchCustomData<PokemonData>('/data/custom-pokedex.json');
        
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
        const baseData = await smartFetch<MoveData>('moves_data', '/data/moves-data.json', isMatch);
        const customData = await fetchCustomData<MoveData>('/data/custom-moves.json');

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
        const baseData = await smartFetch<AbilityData>('abilities_data', '/data/abilities-data.json', isMatch);
        const customData = await fetchCustomData<AbilityData>('/data/custom-abilities.json');

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
        const baseData = await smartFetch<ItemData>('items_data', '/data/items-data.json', isMatch);
        const customData = await fetchCustomData<ItemData>('/data/custom-items.json');

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
        const response = await fetch('/data/statuses-data.json');
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

// ─────────────────────────────────────────────────────────────────────────────
// 탭별 데이터 의존성 매핑 테이블
// 새 탭이 추가되면 이 테이블만 수정하면 됩니다. 엔진 로직은 건드릴 필요 없습니다.
// ─────────────────────────────────────────────────────────────────────────────
type DataKey = 'pokedex' | 'moves' | 'abilities' | 'items' | 'statuses';

const TAB_DATA_DEPS: Record<string, DataKey[]> = {
    'pokedex':        ['pokedex', 'moves', 'abilities', 'items'],
    'party-builder':  ['pokedex', 'moves', 'abilities', 'items'],
    'calculator':     ['pokedex', 'moves'],
    'battle-ai':      ['pokedex', 'moves', 'statuses', 'abilities', 'items'],
    'external-links': [],
    'settings':       [],
};

// 이미지(스프라이트)가 필요한 탭 목록
const SPRITE_TABS = ['pokedex', 'party-builder'] as const;

export interface TabVisibility {
    id: string;
    isVisible: boolean;
}

/**
 * 활성화된 탭 기준으로 필요한 데이터·이미지만 골라서 오프라인 저장합니다.
 * @param onProgress 진행률 콜백
 * @param tabs       현재 탭 설정 (globalStore.getState().tabs). 미전달 시 전체 다운로드.
 */
export async function preloadAllData(
    onProgress?: (current: number, total: number, msg: string) => void,
    tabs?: TabVisibility[]
): Promise<void> {

    // 어떤 DataKey가 필요한지 계산합니다.
    const neededKeys = new Set<DataKey>();
    let needsPokeSprites: boolean;
    let needsItemSprites: boolean;

    if (!tabs || tabs.length === 0) {
        // 탭 정보가 없으면 전부 다운로드
        (['pokedex', 'moves', 'abilities', 'items', 'statuses'] as DataKey[]).forEach(k => neededKeys.add(k));
        needsPokeSprites = true;
        needsItemSprites = true;
    } else {
        const visibleTabIds = tabs.filter(t => t.isVisible).map(t => t.id);
        for (const tabId of visibleTabIds) {
            const deps = TAB_DATA_DEPS[tabId] ?? [];
            deps.forEach(k => neededKeys.add(k));
        }
        needsPokeSprites = visibleTabIds.some(id => (SPRITE_TABS as readonly string[]).includes(id));
        // 아이템 이미지는 pokedex 또는 party-builder에서만 사용
        needsItemSprites = needsPokeSprites;
    }

    // 데이터 태스크 목록 (필요한 것만 포함)
    const allTasks: { key: DataKey; name: string; fn: () => Promise<any> }[] = [
        { key: 'pokedex',   name: '도감 데이터',     fn: fetchPokedexData },
        { key: 'moves',     name: '기술 데이터',     fn: fetchMovesData },
        { key: 'abilities', name: '특성 데이터',     fn: fetchAbilitiesData },
        { key: 'items',     name: '아이템 데이터',   fn: fetchItemsData },
        { key: 'statuses',  name: '상태이상 데이터', fn: fetchStatusData },
    ];
    const tasks = allTasks.filter(t => neededKeys.has(t.key));

    const skipped = allTasks.filter(t => !neededKeys.has(t.key)).map(t => t.name);
    if (skipped.length > 0) {
        console.info(`[오프라인 저장] 비활성 탭 전용 데이터 건너뜀: ${skipped.join(', ')}`);
    }

    const total = tasks.length + 1; // +1: 핵심 리소스 캐싱
    let step = 0;

    // ① 핵심 리소스 캐싱 (Service Worker가 가로채서 캐시함)
    if (onProgress) onProgress(step, total, '앱 핵심 파일 캐싱 중...');
    const scripts = Array.from(document.scripts).map(s => s.src).filter(src => src && src.startsWith(window.location.origin));
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l: any) => l.href).filter(href => href && href.startsWith(window.location.origin));
    const coreResources = [
        '/', '/index.html', '/manifest.json',
        '/icons/favicon.ico', '/icons/icon-192x192.png', '/icons/icon-512x512.png',
        '/apple-touch-icon.png', '/og-image.jpg',
        ...scripts, ...links
    ];
    await Promise.all(coreResources.map(url => fetch(url).catch(() => {})));
    step++;

    // ② 데이터 파일 저장
    for (const task of tasks) {
        if (onProgress) onProgress(step, total, `${task.name} 저장 중...`);
        await task.fn();
        step++;
    }

    if (onProgress) onProgress(total, total, '데이터 저장 완료! 이미지 캐싱 중...');

    // ③ 이미지 프리페치 (필요한 탭이 활성화된 경우만)
    const imageUrls: string[] = [];
    if (needsPokeSprites && neededKeys.has('pokedex')) {
        const pokedex = await fetchPokedexData();
        imageUrls.push(...pokedex.map(p => `/sprites/pokemon/${p.id}.webp`));
    }
    if (needsItemSprites && neededKeys.has('items')) {
        const items = await fetchItemsData();
        imageUrls.push(...items.map(i => `/sprites/items/${i.nameEn}.webp`));
    }

    const imgTotal = imageUrls.length;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < imgTotal; i += CHUNK_SIZE) {
        const chunk = imageUrls.slice(i, i + CHUNK_SIZE);
        if (onProgress) onProgress(total, total, `이미지 캐싱 중... (${i}/${imgTotal})`);
        await Promise.all(chunk.map(url =>
            fetch(url, { mode: 'no-cors', cache: 'force-cache' }).catch(() => {})
        ));
    }

    if (onProgress) onProgress(total, total, '동기화 완료!');
}

/**
 * 테스트용 캐시 비우기 함수
 */
export function resetPokeapiCache() {
    cachedData = null;
    cachedMovesData = null;
    cachedAbilitiesData = null;
    cachedItemsData = null;
    cachedStatusData = null;
    versionMatchPromise = null;
}
