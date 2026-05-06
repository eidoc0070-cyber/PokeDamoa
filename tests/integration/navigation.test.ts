import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test'; // vitest -> bun:test

// vi 기능을 Bun에서도 쓰기 위한 코드
const vi = {
  fn: mock,
  spyOn: spyOn,
  stubGlobal: (name: string, value: any) => {
    (globalThis as any)[name] = value;
  },
  restoreAllMocks: () => {
    // Bun's way to restore mocks if needed
  }
};


// Mock fetch for data files
const mockPokedexData = [
    { 
        id: 1, 
        speciesId: 1, 
        nameKo: '이상해씨', 
        nameEn: 'bulbasaur', 
        searchKey: '이상해씨bulbasaur', 
        types: ['grass', 'poison'], 
        typesPast: [],
        stats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 }, 
        statsPast: [],
        abilities: [{ id: 1, isHidden: false }],
        abilitiesPast: [],
        genId: 1, 
        isDefault: true, 
        learnsets: { 1: [1], 2: [1], 3: [1], 4: [1], 5: [1], 6: [1], 7: [1], 8: [1], 9: [1] } 
    }
];
const mockMovesData = [
    { id: 1, nameKo: '몸통박치기', nameEn: 'tackle', searchKey: '몸통박치기tackle', power: 40, pp: 35, accuracy: 100, type: 'normal', category: 'physical', changelog: [] }
];
const mockAbilitiesData = [
    { id: 1, nameKo: '심록', nameEn: 'overgrow', searchKey: '심록overgrow', effect: 'HP가 적을 때 풀 타입 기술의 위력이 올라간다.' }
];
const mockItemsData = [
    { id: 1, nameKo: '마스터볼', nameEn: 'master-ball', searchKey: '마스터볼master-ball', effect: '반드시 잡을 수 있다.', category: 1 }
];

// Mock global fetch
const originalFetch = globalThis.fetch;
(globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('pokedex-data.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPokedexData)
        });
    }
    if (url.includes('moves-data.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMovesData)
        });
    }
    if (url.includes('abilities-data.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAbilitiesData)
        });
    }
    if (url.includes('items-data.json')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockItemsData)
        });
    }
    return Promise.reject(new Error(`Unhandled fetch: ${url}`));
});

// Mock history
window.history.pushState = vi.fn((data, title, url) => {
    if (url) {
        // @ts-ignore
        window.happyDOM.setURL(url.startsWith('http') ? url : `http://localhost${url}`);
    }
});
window.history.replaceState = vi.fn((data, title, url) => {
    if (url) {
        // @ts-ignore
        window.happyDOM.setURL(url.startsWith('http') ? url : `http://localhost${url}`);
    }
});

// Import App related AFTER global mocks
import { initApp } from '../../src/app.js';
import { globalStore } from '../../src/state/store.js';
import * as pokeApi from '../../src/data/pokeapi.js';


// Helper to wait for conditions
const waitFor = (predicate: () => boolean, options = { timeout: 3000, interval: 100 }): Promise<void> => {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (predicate()) {
                resolve();
                return;
            }
            if (Date.now() - start > options.timeout) {
                reject(new Error(`waitFor timed out: ${predicate.toString()}`));
                return;
            }
            setTimeout(check, options.interval);
        };
        check();
    });
};

// Helper to mock location
const setPathname = (pathname: string) => {
    // @ts-ignore
    window.happyDOM.setURL(`http://localhost${pathname}`);
};

describe('Navigation and Data Loading', () => {
    let container: HTMLElement;
    const originalLocation = globalThis.location;

    beforeEach(() => {
        // Mock API calls
        vi.spyOn(pokeApi, 'fetchPokedexData').mockResolvedValue(mockPokedexData as any);
        vi.spyOn(pokeApi, 'fetchMovesData').mockResolvedValue(mockMovesData as any);
        vi.spyOn(pokeApi, 'fetchAbilitiesData').mockResolvedValue(mockAbilitiesData as any);
        vi.spyOn(pokeApi, 'fetchItemsData').mockResolvedValue(mockItemsData as any);

        // Prepare DOM
        container = document.createElement('div');
        document.body.appendChild(container);

        // Reset Store
        globalStore.setState({
            activeTab: 'settings',
            generation: 9
        });
        
        // Clear Storage
        localStorage.clear();
        sessionStorage.clear();

        // Mock alert
        (globalThis as any).alert = vi.fn();
    });

    afterEach(() => {
        if (container && container.parentElement) {
            document.body.removeChild(container);
        }
        vi.restoreAllMocks();
        try {
            Object.defineProperty(globalThis, 'location', { value: originalLocation, configurable: true });
        } catch (e) {
            (globalThis as any).location = originalLocation;
        }
    });

    it('should load Pokedex Pokemon list when entering /pokedex/pokemon directly', async () => {
        setPathname('/pokedex/pokemon');
        initApp(container);

        await waitFor(() => {
            return container.querySelector('.poke-card') !== null;
        });

        expect(container.querySelector('.pokedex-hub')).not.toBeNull();
        expect(container.querySelector('.poke-card')?.textContent).toContain('이상해씨');
        
        const activeBtn = container.querySelector('.top-tab-btn.active');
        expect(activeBtn?.textContent).toBe('포켓몬');
    });

    it('should load Pokedex Move list when entering /pokedex/move directly', async () => {
        setPathname('/pokedex/move');
        initApp(container);

        await waitFor(() => {
            return container.innerHTML.includes('몸통박치기');
        });

        expect(container.querySelector('.top-tab-btn.active')?.textContent).toBe('기술');
    });

    it('should switch data correctly when clicking sub-tabs', async () => {
        setPathname('/pokedex/pokemon');
        initApp(container);

        await waitFor(() => container.querySelector('.poke-card') !== null);

        const moveTabBtn = Array.from(container.querySelectorAll('.top-tab-btn'))
            .find(btn => btn.textContent === '기술') as HTMLButtonElement;
        
        expect(moveTabBtn).toBeDefined();
        moveTabBtn.click();

        await waitFor(() => {
            return container.innerHTML.includes('몸통박치기');
        });

        expect(container.querySelector('.top-tab-btn.active')?.textContent).toBe('기술');
        expect(container.querySelector('.poke-card')).toBeNull();
    });

    it('should load Calculator when entering /calculator directly', async () => {
        setPathname('/calculator');
        initApp(container);

        await waitFor(() => {
            return container.innerHTML.includes('계산기');
        });

        expect(globalStore.getState().activeTab).toBe('calculator');
    });

    it('should switch main tabs when clicking bottom navigation buttons', async () => {
        setPathname('/'); // settings 탭 기본값
        initApp(container);

        // Bottom Nav 렌더링 대기
        await waitFor(() => container.querySelector('.bottom-nav') !== null);

        // Pokedex 탭 버튼 찾기 및 클릭
        const pokedexBtn = container.querySelector('.bottom-nav-item[data-tab="pokedex"]') as HTMLButtonElement;
        expect(pokedexBtn).not.toBeNull();
        pokedexBtn.click();

        // 탭 상태 전환 및 Pokedex UI 렌더링 대기
        await waitFor(() => globalStore.getState().activeTab === 'pokedex');
        await waitFor(() => container.querySelector('.pokedex-hub') !== null);

        // 검증
        expect(globalStore.getState().activeTab).toBe('pokedex');
        expect(container.querySelector('.top-tab-bar')).not.toBeNull(); // 서브 탭도 렌더링 되어야 함
    });
});
