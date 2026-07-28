import { describe, expect, it } from "bun:test";
import {
    getLearnableMoveIds,
    getMoveItemStyle,
    getSortedMovesForPoke,
    renderMoveItemExtra,
} from "../../src/utils/pokemon-math.js";

describe("Move Logic Utilities", () => {
    const mockPoke = {
        id: 1,
        nameKo: "이상해씨",
        learnsets: {
            1: [1, 2, 3], // 몸통박치기, 덩굴채찍, 독가루
            9: [1, 2, 4], // 몸통박치기, 덩굴채찍, 리프스톰
        },
    };

    const mockMoves = [
        { id: 1, nameKo: "몸통박치기", type: "normal", power: 40 },
        { id: 3, nameKo: "독가루", type: "poison", power: 0 },
        { id: 4, nameKo: "리프스톰", type: "grass", power: 130 },
        { id: 5, nameKo: "지진", type: "ground", power: 100 },
    ];

    describe("getLearnableMoveIds", () => {
        it("should return correct move IDs for a specific generation", () => {
            const gen1Moves = getLearnableMoveIds(mockPoke, 1);
            expect(gen1Moves.has(1)).toBe(true);
            expect(gen1Moves.has(3)).toBe(true);
            expect(gen1Moves.has(4)).toBe(false);
        });

        it("should return correct move IDs for Gen 9", () => {
            const gen9Moves = getLearnableMoveIds(mockPoke, 9);
            expect(gen9Moves.has(1)).toBe(true);
            expect(gen9Moves.has(4)).toBe(true);
            expect(gen9Moves.has(3)).toBe(false);
        });

        it("should return empty set if poke is null", () => {
            const moves = getLearnableMoveIds(null, 9);
            expect(moves.size).toBe(0);
        });
    });

    describe("getSortedMovesForPoke", () => {
        it("should sort learnable moves to the top", () => {
            // Gen 1: 1, 3은 배움 / 4, 5는 못 배움
            // 이름순 정렬: "독가루"(3) < "몸통박치기"(1) (한글 가나다순)
            const sorted = getSortedMovesForPoke(mockMoves, mockPoke, 1);

            // 배울 수 있는 기술이 앞쪽에 위치해야 함 (3, 1 순서)
            expect(sorted[0].id).toBe(3); // 독가루 (배움, 가나다순 위)
            expect(sorted[1].id).toBe(1); // 몸통박치기 (배움, 가나다순 아래)
            // 배울 수 없는 기술이 뒤쪽에 위치 (4, 5)
            // 이름순: "리프스톰"(4) < "지진"(5)
            expect(sorted[2].id).toBe(4); // 리프스톰
            expect(sorted[3].id).toBe(5); // 지진
        });

        it("should apply filter function correctly", () => {
            // 위력이 0보다 큰 기술만 필터링
            const sorted = getSortedMovesForPoke(mockMoves, mockPoke, 1, (m) => m.power > 0);
            expect(sorted.length).toBe(3);
            expect(sorted.find((m) => m.id === 3)).toBeUndefined(); // 독가루 제외
        });
    });

    describe("getMoveItemStyle", () => {
        it("should return highlighting style for learnable moves", () => {
            const style = getMoveItemStyle({ id: 1 }, mockPoke, 1);
            expect(style.background).toBeDefined();
            expect(style.borderLeft).toContain("solid");
        });

        it("should return empty style for non-learnable moves", () => {
            const style = getMoveItemStyle({ id: 5 }, mockPoke, 1);
            expect(Object.keys(style).length).toBe(0);
        });
    });

    describe("renderMoveItemExtra", () => {
        it("should include '습득 가능' text for learnable moves", () => {
            const html = renderMoveItemExtra({ id: 1, type: "normal" }, mockPoke, 1, { normal: "#ccc" });
            expect(html).toContain("습득 가능");
        });

        it("should not include '습득 가능' text for non-learnable moves", () => {
            const html = renderMoveItemExtra({ id: 5, type: "ground" }, mockPoke, 1, { ground: "#8b4513" });
            expect(html).not.toContain("습득 가능");
        });
    });
});
