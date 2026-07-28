import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { preloadAllData, resetPokeapiCache } from "../../src/data/pokeapi.js";

// IndexedDB Mocking
const mockDb: Record<string, any> = {};
mock.module("../../src/utils/storage-db.js", () => ({
    saveToDB: async (key: string, data: any) => {
        mockDb[key] = data;
        return Promise.resolve();
    },
    getFromDB: async (key: string) => {
        return Promise.resolve(mockDb[key] ?? null);
    },
    openDB: async () => ({}),
}));

// Fetch Mocking
const _originalFetch = global.fetch;
const mockFetch = mock((url: string) => {
    if (url.includes(".json")) {
        return Promise.resolve({
            ok: true,
            json: async () => [{ id: 1, nameKo: "테스트" }],
        });
    }
    return Promise.resolve({ ok: true });
});
global.fetch = mockFetch as any;

describe("오프라인 동기화(Offline Sync) 통합 테스트", () => {
    beforeEach(() => {
        resetPokeapiCache();
        // Mock 데이터 초기화
        // Mock 데이터 초기화
        for (const key in mockDb) delete mockDb[key];
        mockFetch.mockClear();
    });

    test("preloadAllData가 모든 JSON 데이터를 fetch하고 IndexedDB에 저장하는가", async () => {
        const progressLogs: string[] = [];
        const onProgress = (_curr: number, _total: number, msg: string) => {
            progressLogs.push(msg);
        };

        await preloadAllData(onProgress);

        // 1. 필요한 모든 데이터 파일들이 fetch 되었는지 확인
        const fetchedUrls = mockFetch.mock.calls.map((call) => call[0] as string);
        expect(fetchedUrls).toContain("/data/pokedex-data.json");
        expect(fetchedUrls).toContain("/data/moves-data.json");
        expect(fetchedUrls).toContain("/data/abilities-data.json");
        expect(fetchedUrls).toContain("/data/items-data.json");
        expect(fetchedUrls).toContain("/data/statuses-data.json");

        // 2. IndexedDB(Mock)에 데이터가 저장되었는지 확인
        expect(mockDb).toHaveProperty("pokedex_data");
        expect(mockDb).toHaveProperty("moves_data");
        expect(mockDb).toHaveProperty("abilities_data");
        expect(mockDb).toHaveProperty("items_data");

        // 3. 콜백이 정상적으로 호출되었는지 확인
        expect(progressLogs.length).toBeGreaterThan(0);
        expect(progressLogs).toContain("도감 데이터 저장 중...");
        expect(progressLogs).toContain("동기화 완료!");
    });

    test("이미지 프리페치(Prefetch)가 정상적으로 호출되는가", async () => {
        await preloadAllData();

        // fetch 호출 목록 중 이미지 경로가 포함되어 있는지 확인
        const fetchedUrls = mockFetch.mock.calls.map((call) => call[0] as string);
        const imageRequests = fetchedUrls.filter((url) => url.includes("/sprites/"));

        // Mock 데이터에서 포켓몬 ID 1번이 있으므로 해당 이미지가 요청되어야 함
        expect(imageRequests.length).toBeGreaterThan(0);
        expect(imageRequests).toContain("/sprites/pokemon/1.webp");
    });

    test("동기화 도중 오류가 발생해도 중단되지 않고 진행되는가 (이미지 실패 시)", async () => {
        // 이미지만 실패하도록 Mock 설정
        global.fetch = mock((url: string) => {
            if (url.includes("/sprites/")) return Promise.reject(new Error("Network Error"));
            return Promise.resolve({
                ok: true,
                json: async () => [{ id: 1, nameKo: "테스트", nameEn: "test" }],
            });
        }) as any;

        await expect(preloadAllData()).resolves.toBeUndefined();

        // Fetch 원복
        global.fetch = mockFetch as any;
    });

    afterEach(() => {
        global.fetch = mockFetch as any;
        resetPokeapiCache();
    });
});
