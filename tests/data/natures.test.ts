import { describe, expect, it } from "bun:test";
import { NATURES } from "../../src/data/constants.js";

describe("Natures Data", () => {
    it("should have exactly 25 natures", () => {
        expect(NATURES).toHaveLength(25);
    });

    it("should have correct stat modifiers for key natures", () => {
        const adamant = NATURES.find((n) => n.nameKo === "고집");
        expect(adamant?.plus).toBe("atk");
        expect(adamant?.minus).toBe("spa");

        const jolly = NATURES.find((n) => n.nameKo === "명랑");
        expect(jolly?.plus).toBe("spe");
        expect(jolly?.minus).toBe("spa");

        const timid = NATURES.find((n) => n.nameKo === "겁쟁이");
        expect(timid?.plus).toBe("spe");
        expect(timid?.minus).toBe("atk");

        const modest = NATURES.find((n) => n.nameKo === "조심");
        expect(modest?.plus).toBe("spa");
        expect(modest?.minus).toBe("atk");
    });

    it("should have neutral natures without modifiers", () => {
        const neutralNatures = ["하디", "온순", "진지", "수줍음", "변덕"];
        neutralNatures.forEach((name) => {
            const nature = NATURES.find((n) => n.nameKo === name);
            expect(nature?.plus).toBeUndefined();
            expect(nature?.minus).toBeUndefined();
        });
    });

    it("should ensure all IDs are unique and within 0-24 range", () => {
        const ids = NATURES.map((n) => n.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(25);
        ids.forEach((id) => {
            expect(id).toBeGreaterThanOrEqual(0);
            expect(id).toBeLessThan(25);
        });
    });
});
