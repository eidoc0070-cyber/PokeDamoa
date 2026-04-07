
import { describe, it, expect } from 'vitest';
import { calculateStat, calculateBaseDamage, calculateDamageRolls, calculateTypeMultiplier } from './pokemon-math';

describe('pokemon-math utility', () => {
  describe('calculateStat', () => {
    it('should calculate HP correctly for Garchomp (Base 108, IV 31, EV 0, Level 50)', () => {
      // (2 * 108 + 31 + 0) * 50 / 100 + 50 + 10 = 247 * 0.5 + 60 = 123.5 + 60 = 183
      expect(calculateStat(108, 31, 0, 50, true)).toBe(183);
    });

    it('should calculate Attack correctly for Garchomp Adamant (Base 130, IV 31, EV 252, Level 50, Nature 1.1)', () => {
      // ((2 * 130 + 31 + 252/4) * 50 / 100 + 5) * 1.1 
      // = ((260 + 31 + 63) * 0.5 + 5) * 1.1
      // = (354 * 0.5 + 5) * 1.1 = (177 + 5) * 1.1 = 182 * 1.1 = 200.2 -> 200
      expect(calculateStat(130, 31, 252, 50, false, 1.1)).toBe(200);
    });

    it('should handle Shedinja HP case', () => {
      expect(calculateStat(1, 31, 252, 100, true)).toBe(1);
    });
  });

  describe('calculateBaseDamage', () => {
    it('should calculate basic damage correctly', () => {
      // Level 50, Power 90, Attack 200, Defense 150
      // ( (2*50/5 + 2) * 90 * 200 / 150 ) / 50 + 2
      // ( 22 * 90 * 200 / 150 ) / 50 + 2
      // ( 1980 * 200 / 150 ) / 50 + 2
      // ( 396000 / 150 ) / 50 + 2
      // ( 2640 ) / 50 + 2 = 52.8 + 2 = 54
      expect(calculateBaseDamage(50, 90, 200, 150)).toBe(54);
    });
  });

  describe('calculateDamageRolls', () => {
    it('should return 16 rolls with step-by-step flooring', () => {
      const rolls = calculateDamageRolls(100, 1.5, 2.0, 1.0);
      expect(rolls).toHaveLength(16);
      // Max roll: 100 * 100/100 = 100 -> floor(100 * 1.5) = 150 -> floor(150 * 2.0) = 300
      expect(rolls[rolls.length - 1]).toBe(300);
      // Min roll: 100 * 85/100 = 85 -> floor(85 * 1.5) = 127 -> floor(127 * 2.0) = 254
      expect(rolls[0]).toBe(254);
    });
  });

  describe('calculateTypeMultiplier', () => {
    const mockMatchups = {
      fire: { grass: 2.0, water: 0.5, fire: 0.5 },
      water: { fire: 2.0, grass: 0.5, water: 0.5 }
    };

    it('should calculate single type multiplier', () => {
      expect(calculateTypeMultiplier('fire', ['grass'], mockMatchups)).toBe(2.0);
    });

    it('should calculate double type multiplier', () => {
      expect(calculateTypeMultiplier('fire', ['grass', 'fire'], mockMatchups)).toBe(1.0);
    });

    it('should handle 0x multiplier', () => {
        const matchupsWithImmunity = {
            ground: { electric: 2.0, flying: 0 }
        };
        expect(calculateTypeMultiplier('ground', ['flying'], matchupsWithImmunity)).toBe(0);
    });
  });
});
