import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fetchPokedexData, preloadAllData, resetPokeapiCache } from "../../src/data/pokeapi.js";
import { saveToDB } from "../../src/utils/storage-db.js";

describe("preloadAllData tab-aware caching", () => {
    let originalFetch: typeof fetch;
    const fetchedUrls: string[] = [];
    // 매 테스트마다 단조증가하는 버전 카운터.
    // Date.now() 대신 사용하면 동일 ms 내 복수 테스트 실행 시에도 버전이 절대 충돌하지 않으며,
    // DB에 저장된 이전 버전과도 일치하지 않아 isVersionMatch가 항상 false가 됩니다.
    let testVersion = 0;

    beforeEach(async () => {
        // Reset Pokeapi module cache
        resetPokeapiCache();
        testVersion++; // 매 테스트마다 고유한 버전 번호 부여

        // Clear fake-indexeddb database (완전히 새로 시작)
        await new Promise<void>((resolve, reject) => {
            const openReq = indexedDB.open("PokeDaMoaDB", 1);
            openReq.onupgradeneeded = () => {
                const db = openReq.result;
                if (!db.objectStoreNames.contains("cachedData")) {
                    db.createObjectStore("cachedData");
                }
            };
            openReq.onsuccess = () => {
                const db = openReq.result;
                const tx = db.transaction("cachedData", "readwrite");
                tx.objectStore("cachedData").clear();
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    db.close();
                    resolve();
                };
            };
            openReq.onerror = () => resolve();
        });

        // Mock fetch
        originalFetch = globalThis.fetch;
        fetchedUrls.length = 0;

        globalThis.fetch = mock((url: string | URL | Request) => {
            const urlStr = url.toString();
            fetchedUrls.push(urlStr);

            let responseContent = "[]";
            if (urlStr.includes("version.json")) {
                // testVersion: 매 beforeEach마다 증가하는 고유 값.
                // DB에 저장된 이전 버전과 절대 일치하지 않으므로 isVersionMatch는 항상 false.
                responseContent = JSON.stringify({ version: testVersion });
            } else if (urlStr.includes("pokedex-data.json")) {
                responseContent = JSON.stringify([{ id: 1, nameEn: "bulbasaur" }]);
            } else if (urlStr.includes("items-data.json")) {
                responseContent = JSON.stringify([{ id: 1, nameEn: "master-ball" }]);
            }

            return Promise.resolve(
                new Response(responseContent, {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            );
        }) as any;

        // Mock document scripts & links
        Object.defineProperty(document, "scripts", {
            value: [],
            writable: true,
            configurable: true,
        });
        document.querySelectorAll = mock(() => []) as any;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("should fetch everything when tabs list is not provided", async () => {
        await preloadAllData();

        const loadedJson = fetchedUrls.filter((url) => url.endsWith(".json"));
        expect(loadedJson).toContain("/data/pokedex-data.json");
        expect(loadedJson).toContain("/data/moves-data.json");
        expect(loadedJson).toContain("/data/abilities-data.json");
        expect(loadedJson).toContain("/data/items-data.json");
        expect(loadedJson).toContain("/data/statuses-data.json");

        // Should load sprites
        expect(fetchedUrls).toContain("/sprites/pokemon/1.webp");
        expect(fetchedUrls).toContain("/sprites/items/master-ball.webp");
    });

    it("should skip specific datasets and sprites if their corresponding tabs are hidden", async () => {
        const mockTabs = [
            { id: "pokedex", isVisible: false },
            { id: "party-builder", isVisible: false },
            { id: "calculator", isVisible: false },
            { id: "battle-ai", isVisible: false },
            { id: "external-links", isVisible: true },
            { id: "settings", isVisible: true },
        ];

        await preloadAllData(undefined, mockTabs);

        const loadedJson = fetchedUrls.filter((url) => url.endsWith(".json"));
        expect(loadedJson).not.toContain("/data/pokedex-data.json");
        expect(loadedJson).not.toContain("/data/moves-data.json");
        expect(loadedJson).not.toContain("/data/abilities-data.json");
        expect(loadedJson).not.toContain("/data/items-data.json");
        expect(loadedJson).not.toContain("/data/statuses-data.json");

        // Sprites should also be skipped
        expect(fetchedUrls).not.toContain("/sprites/pokemon/1.webp");
        expect(fetchedUrls).not.toContain("/sprites/items/master-ball.webp");
    });

    it("should download moves and pokedex but skip sprites when only calculator tab is active", async () => {
        const mockTabs = [
            { id: "pokedex", isVisible: false },
            { id: "party-builder", isVisible: false },
            { id: "calculator", isVisible: true },
            { id: "battle-ai", isVisible: false },
            { id: "external-links", isVisible: false },
            { id: "settings", isVisible: true },
        ];

        await preloadAllData(undefined, mockTabs);

        const loadedJson = fetchedUrls.filter((url) => url.endsWith(".json"));

        expect(loadedJson).toContain("/data/pokedex-data.json");
        expect(loadedJson).toContain("/data/moves-data.json");
        expect(loadedJson).not.toContain("/data/abilities-data.json");
        expect(loadedJson).not.toContain("/data/items-data.json");
        expect(loadedJson).not.toContain("/data/statuses-data.json");

        expect(fetchedUrls).not.toContain("/sprites/pokemon/1.webp");
        expect(fetchedUrls).not.toContain("/sprites/items/master-ball.webp");
    });

    it("should download everything including status, ability, item data but skip sprites when only battle-ai tab is active", async () => {
        const mockTabs = [
            { id: "pokedex", isVisible: false },
            { id: "party-builder", isVisible: false },
            { id: "calculator", isVisible: false },
            { id: "battle-ai", isVisible: true },
            { id: "external-links", isVisible: false },
            { id: "settings", isVisible: true },
        ];

        await preloadAllData(undefined, mockTabs);

        const loadedJson = fetchedUrls.filter((url) => url.endsWith(".json"));

        expect(loadedJson).toContain("/data/pokedex-data.json");
        expect(loadedJson).toContain("/data/moves-data.json");
        expect(loadedJson).toContain("/data/statuses-data.json");
        expect(loadedJson).toContain("/data/abilities-data.json");
        expect(loadedJson).toContain("/data/items-data.json");

        expect(fetchedUrls).not.toContain("/sprites/pokemon/1.webp");
        expect(fetchedUrls).not.toContain("/sprites/items/master-ball.webp");
    });

    it("should fallback to fetch if IndexedDB cache is empty array despite version match", async () => {
        // Simulate IndexedDB returning empty array [] for pokedex_data (버전은 일치하지만 데이터가 비어있는 상황)
        await saveToDB("pokedex_data", []);

        await fetchPokedexData();

        const loadedJson = fetchedUrls.filter((url) => url.endsWith(".json"));
        expect(loadedJson).toContain("/data/pokedex-data.json");
    });
});
