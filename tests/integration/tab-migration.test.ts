import { describe, expect, it } from "bun:test";
import type { TabItem } from "../../src/state/storage.js";
import { DEFAULT_TABS } from "../../src/state/storage.js";

/**
 * app.ts에 구현된 마이그레이션 로직을 모사하여 테스트합니다.
 */
function syncTabs(savedTabs: TabItem[], defaultTabs: TabItem[]): TabItem[] {
    let finalTabs: TabItem[] = [...savedTabs];

    // 누락된 탭 추가
    defaultTabs.forEach((defTab, index) => {
        const exists = finalTabs.some((t) => t.id === defTab.id);
        if (!exists) {
            finalTabs.splice(index, 0, { ...defTab });
        }
    });

    // 커스터마이징 안 된 탭들 최신화
    finalTabs = finalTabs.map((tab) => {
        const defTab = defaultTabs.find((t) => t.id === tab.id);
        if (defTab && !tab.isCustomized) {
            return { ...defTab };
        }
        return tab;
    });

    // 유효하지 않은 탭 제거
    finalTabs = finalTabs.filter((tab) => defaultTabs.some((t) => t.id === tab.id));

    return finalTabs;
}

describe("Tab Migration Logic", () => {
    it("should add missing party-builder tab to existing settings", () => {
        const savedTabs: TabItem[] = [
            { id: "pokedex", currentName: "도감", isVisible: true, isCustomized: false },
            { id: "calculator", currentName: "계산기", isVisible: true, isCustomized: false },
            { id: "settings", currentName: "설정", isVisible: true, isCustomized: false },
        ];

        const result = syncTabs(savedTabs, DEFAULT_TABS);

        expect(result.some((t) => t.id === "party-builder")).toBe(true);
        // 도감 이름이 아이콘 포함된 기본값으로 복구되어야 함 (isCustomized가 false이므로)
        const pokedex = result.find((t) => t.id === "pokedex");
        expect(pokedex?.currentName).toBe("📚 정보 도감");
    });

    it("should respect user customization (isCustomized: true)", () => {
        const savedTabs: TabItem[] = [
            { id: "pokedex", currentName: "나만의 도감", isVisible: true, isCustomized: true },
            { id: "settings", currentName: "설정", isVisible: true, isCustomized: false },
        ];

        const result = syncTabs(savedTabs, DEFAULT_TABS);

        const pokedex = result.find((t) => t.id === "pokedex");
        expect(pokedex?.currentName).toBe("나만의 도감"); // 유지되어야 함
        expect(result.some((t) => t.id === "party-builder")).toBe(true); // 하지만 새 탭은 추가되어야 함
    });

    it("should remove deprecated tabs", () => {
        const savedTabs: TabItem[] = [
            { id: "pokedex", currentName: "도감", isVisible: true },
            { id: "old-tab", currentName: "옛날탭", isVisible: true },
        ] as any;

        const result = syncTabs(savedTabs, DEFAULT_TABS);
        expect(result.some((t) => t.id === "old-tab")).toBe(false);
    });
});
