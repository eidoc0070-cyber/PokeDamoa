import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { preloadAllData, resetPokeapiCache } from '../../src/data/pokeapi.js';

// In-memory Mock IndexedDB Implementation for testing
class MockIDBRequest {
    result: any = null;
    error: any = null;
    onsuccess: (() => void) | null = null;
    onerror: (() => void) | null = null;
}

class MockIDBTransaction {
    store: MockIDBObjectStore;
    constructor(store: MockIDBObjectStore) {
        this.store = store;
    }
    objectStore() {
        return this.store;
    }
}

class MockIDBObjectStore {
    data: Record<string, any> = {};
    get(key: string) {
        const req = new MockIDBRequest();
        setTimeout(() => {
            req.result = this.data[key] || null;
            if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
    }
    put(value: any, key: string) {
        const req = new MockIDBRequest();
        setTimeout(() => {
            this.data[key] = value;
            req.result = key;
            if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
    }
}

class MockIDBDatabase {
    store = new MockIDBObjectStore();
    objectStoreNames = {
        contains: () => true
    };
    transaction() {
        return new MockIDBTransaction(this.store);
    }
}

const mockDbInstance = new MockIDBDatabase();

describe('preloadAllData tab-aware caching', () => {
    let originalFetch: typeof fetch;
    let originalIndexedDB: typeof indexedDB;
    const fetchedUrls: string[] = [];

    beforeEach(() => {
        // Reset Pokeapi module cache
        resetPokeapiCache();

        // Clear mock database
        mockDbInstance.store.data = {};

        // Mock IndexedDB
        originalIndexedDB = globalThis.indexedDB;
        globalThis.indexedDB = {
            open: () => {
                const req = new MockIDBRequest();
                setTimeout(() => {
                    req.result = mockDbInstance;
                    if (req.onsuccess) req.onsuccess();
                }, 0);
                return req as any;
            }
        } as any;

        // Mock fetch
        originalFetch = globalThis.fetch;
        fetchedUrls.length = 0;

        globalThis.fetch = mock((url: string | URL | Request) => {
            const urlStr = url.toString();
            fetchedUrls.push(urlStr);

            let responseContent = '[]';
            if (urlStr.includes('version.json')) {
                responseContent = '{"version": 1}';
            } else if (urlStr.includes('pokedex-data.json')) {
                responseContent = JSON.stringify([{ id: 1, nameEn: 'bulbasaur' }]);
            } else if (urlStr.includes('items-data.json')) {
                responseContent = JSON.stringify([{ id: 1, nameEn: 'master-ball' }]);
            }

            return Promise.resolve(new Response(responseContent, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }));
        }) as any;

        // Mock document scripts & links
        Object.defineProperty(document, 'scripts', {
            value: [],
            writable: true,
            configurable: true
        });
        document.querySelectorAll = mock(() => []) as any;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        globalThis.indexedDB = originalIndexedDB;
    });

    it('should fetch everything when tabs list is not provided', async () => {
        await preloadAllData();

        const loadedJson = fetchedUrls.filter(url => url.endsWith('.json'));
        expect(loadedJson).toContain('/data/pokedex-data.json');
        expect(loadedJson).toContain('/data/moves-data.json');
        expect(loadedJson).toContain('/data/abilities-data.json');
        expect(loadedJson).toContain('/data/items-data.json');
        expect(loadedJson).toContain('/data/statuses-data.json');

        // Should load sprites
        expect(fetchedUrls).toContain('/sprites/pokemon/1.webp');
        expect(fetchedUrls).toContain('/sprites/items/master-ball.webp');
    });

    it('should skip specific datasets and sprites if their corresponding tabs are hidden', async () => {
        const mockTabs = [
            { id: 'pokedex', isVisible: false },
            { id: 'party-builder', isVisible: false },
            { id: 'calculator', isVisible: false },
            { id: 'battle-ai', isVisible: false },
            { id: 'external-links', isVisible: true },
            { id: 'settings', isVisible: true },
        ];

        await preloadAllData(undefined, mockTabs);

        const loadedJson = fetchedUrls.filter(url => url.endsWith('.json'));
        expect(loadedJson).not.toContain('/data/pokedex-data.json');
        expect(loadedJson).not.toContain('/data/moves-data.json');
        expect(loadedJson).not.toContain('/data/abilities-data.json');
        expect(loadedJson).not.toContain('/data/items-data.json');
        expect(loadedJson).not.toContain('/data/statuses-data.json');

        // Sprites should also be skipped
        expect(fetchedUrls).not.toContain('/sprites/pokemon/1.webp');
        expect(fetchedUrls).not.toContain('/sprites/items/master-ball.webp');
    });

    it('should download moves and pokedex but skip sprites when only calculator tab is active', async () => {
        const mockTabs = [
            { id: 'pokedex', isVisible: false },
            { id: 'party-builder', isVisible: false },
            { id: 'calculator', isVisible: true },
            { id: 'battle-ai', isVisible: false },
            { id: 'external-links', isVisible: false },
            { id: 'settings', isVisible: true },
        ];

        await preloadAllData(undefined, mockTabs);

        const loadedJson = fetchedUrls.filter(url => url.endsWith('.json'));

        expect(loadedJson).toContain('/data/pokedex-data.json');
        expect(loadedJson).toContain('/data/moves-data.json');
        expect(loadedJson).not.toContain('/data/abilities-data.json');
        expect(loadedJson).not.toContain('/data/items-data.json');
        expect(loadedJson).not.toContain('/data/statuses-data.json');

        expect(fetchedUrls).not.toContain('/sprites/pokemon/1.webp');
        expect(fetchedUrls).not.toContain('/sprites/items/master-ball.webp');
    });

    it('should download everything including status, ability, item data but skip sprites when only battle-ai tab is active', async () => {
        const mockTabs = [
            { id: 'pokedex', isVisible: false },
            { id: 'party-builder', isVisible: false },
            { id: 'calculator', isVisible: false },
            { id: 'battle-ai', isVisible: true },
            { id: 'external-links', isVisible: false },
            { id: 'settings', isVisible: true },
        ];

        await preloadAllData(undefined, mockTabs);

        const loadedJson = fetchedUrls.filter(url => url.endsWith('.json'));

        expect(loadedJson).toContain('/data/pokedex-data.json');
        expect(loadedJson).toContain('/data/moves-data.json');
        expect(loadedJson).toContain('/data/statuses-data.json');
        expect(loadedJson).toContain('/data/abilities-data.json');
        expect(loadedJson).toContain('/data/items-data.json');

        expect(fetchedUrls).not.toContain('/sprites/pokemon/1.webp');
        expect(fetchedUrls).not.toContain('/sprites/items/master-ball.webp');
    });
});
