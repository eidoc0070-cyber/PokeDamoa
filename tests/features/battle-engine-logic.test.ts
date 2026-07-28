import { describe, expect, it } from "bun:test";
import { TYPE_MATCHUPS } from "../../src/data/constants.js";
import {
    calculateBaseDamage,
    calculateDamageRolls,
    calculateStat,
    calculateTypeMultiplier,
    getRankMultiplier,
} from "../../src/utils/pokemon-math.js";

describe("Battle Engine Core Logic Tests", () => {
    describe("Stat Calculations", () => {
        it("should calculate HP correctly (Garchomp Level 50, 0 EVs, 31 IVs)", () => {
            // 한카리아스 종족값 HP 108
            const hp = calculateStat(108, 31, 0, 50, true);
            expect(hp).toBe(183);
        });

        it("should calculate HP correctly (Garchomp Level 50, 252 EVs, 31 IVs)", () => {
            const hp = calculateStat(108, 31, 252, 50, true);
            expect(hp).toBe(215);
        });

        it("should calculate non-HP stats correctly (Garchomp Attack Level 50, 252 EVs, 31 IVs, Adamant nature)", () => {
            // 한카리아스 종족값 Atk 130
            const atk = calculateStat(130, 31, 252, 50, false, 1.1);
            expect(atk).toBe(200);
        });

        it("should calculate Shedinja HP correctly (HP Base 1 should always be 1)", () => {
            const hp = calculateStat(1, 31, 252, 100, true);
            expect(hp).toBe(1);
        });
    });

    describe("Damage Calculations", () => {
        it("should calculate base damage correctly", () => {
            // Level 50, Power 100, Atk 200, Def 150
            const baseDmg = calculateBaseDamage(50, 100, 200, 150);
            // 공식: floor(floor(floor(2 * 50 / 5 + 2) * 100 * 200 / 150) / 50) + 2
            // floor(floor(floor(22) * 100 * 200 / 150) / 50) + 2
            // floor(floor(4400 / 1.5) / 50) + 2 = floor(2933 / 50) + 2 = 58 + 2 = 60
            expect(baseDmg).toBe(60);
        });

        it("should apply STAB and type multipliers to damage rolls", () => {
            const baseDmg = 100;
            const stab = 1.5;
            const typeMult = 2.0; // Effective
            const rolls = calculateDamageRolls(baseDmg, stab, typeMult);

            // Min roll: floor(floor(100 * 0.85) * 1.5) * 2 = floor(85 * 1.5) * 2 = 127 * 2 = 254
            expect(rolls[0]).toBe(254);
            // Max roll: floor(floor(100 * 1.0) * 1.5) * 2 = floor(100 * 1.5) * 2 = 150 * 2 = 300
            expect(rolls[15]).toBe(300);
        });

        it("should handle zero type multiplier (Immunity)", () => {
            const baseDmg = 100;
            const typeMult = 0.0;
            const rolls = calculateDamageRolls(baseDmg, 1.5, typeMult);
            expect(rolls.every((r) => r === 0)).toBe(true);
        });
    });

    describe("Type Effectiveness", () => {
        it("should calculate Fire vs Grass correctly (2.0x)", () => {
            const mult = calculateTypeMultiplier("fire", ["grass"], TYPE_MATCHUPS as any);
            expect(mult).toBe(2.0);
        });

        it("should calculate Water vs Fire/Ground correctly (4.0x)", () => {
            const mult = calculateTypeMultiplier("water", ["fire", "ground"], TYPE_MATCHUPS as any);
            expect(mult).toBe(4.0);
        });

        it("should calculate Electric vs Ground correctly (0.0x)", () => {
            const mult = calculateTypeMultiplier("electric", ["ground"], TYPE_MATCHUPS as any);
            expect(mult).toBe(0);
        });
    });

    describe("Rank Modifiers", () => {
        it("should return correct multiplier for +2 rank", () => {
            expect(getRankMultiplier(2)).toBe(2.0); // 4/2
        });

        it("should return correct multiplier for -2 rank", () => {
            expect(getRankMultiplier(-2)).toBe(0.5); // 2/4
        });

        it("should return 1.0 for 0 rank", () => {
            expect(getRankMultiplier(0)).toBe(1.0);
        });
    });
});
