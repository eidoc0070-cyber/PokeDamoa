import { describe, expect, it } from "bun:test";
import { exportShowdown, parseShowdown } from "../../src/features/party-builder/parser.js";
import type { PokemonSlot } from "../../src/features/party-builder/types.js";

describe("Showdown Parser", () => {
    const mockCtx = {
        pokemon: [{ id: 1, nameKo: "이상해씨", nameEn: "Bulbasaur" }],
        items: [{ id: 1, nameKo: "마스터볼", nameEn: "Master Ball" }],
        moves: [{ id: 1, nameKo: "막치기", nameEn: "Pound" }],
        abilities: [{ id: 1, nameKo: "악취", nameEn: "Stench" }],
    };

    it("should parse English Showdown format", () => {
        const text = `Bulbasaur @ Master Ball
Ability: Stench
EVs: 252 Atk / 252 Spe
Adamant Nature
- Pound`;
        const slots = parseShowdown(text, mockCtx);
        expect(slots.length).toBe(1);
        const slot = slots[0];
        if (!slot) throw new Error("Slot should exist");

        expect(slot.pokemonId).toBe(1);
        expect(slot.itemId).toBe(1);
        expect(slot.abilityId).toBe(1);
        expect(slot.evs.atk).toBe(252);
        expect(slot.evs.spe).toBe(252);
        expect(slot.natureId).toBe(3); // Adamant
        expect(slot.moveIds[0]).toBe(1);
    });

    it("should parse Korean Showdown format", () => {
        const text = `이상해씨 @ 마스터볼
특성: 악취
노력치: 공격 252 / 스피드 252
고집 성격
- 막치기`;
        const slots = parseShowdown(text, mockCtx);
        expect(slots.length).toBe(1);
        const slot = slots[0];
        if (!slot) throw new Error("Slot should exist");

        expect(slot.pokemonId).toBe(1);
        expect(slot.evs.atk).toBe(252);
        expect(slot.natureId).toBe(3);
    });

    it("should export to Korean Showdown format", () => {
        const slot: PokemonSlot = {
            pokemonId: 1,
            itemId: 1,
            abilityId: 1,
            moveIds: [1, null, null, null],
            evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            natureId: 3,
            level: 100,
        };
        const exported = exportShowdown(slot, mockCtx, "ko");
        expect(exported).toContain("이상해씨 @ 마스터볼");
        expect(exported).toContain("특성: 악취");
        expect(exported).toContain("노력치: 공격 252 / 스피드 252");
        expect(exported).toContain("고집 성격");
        expect(exported).toContain("- 막치기");
    });
});
