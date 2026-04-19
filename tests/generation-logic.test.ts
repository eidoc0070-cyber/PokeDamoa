import { describe, it, expect } from 'bun:test'; // vitest -> bun:test
import { getTypeMatchupsForGen, getTypesForGenList } from '../src/data/constants';
import { getStatsForGen, getTypesForGen, getAbilitiesForGen } from '../src/utils/pokemon-math';

describe('Generation Logic Tests', () => {
    describe('getTypeMatchupsForGen', () => {
        it('should handle Gen 1 special matchups (Ghost -> Psychic is 0x, Poison <-> Bug is 2x)', () => {
            const gen1 = getTypeMatchupsForGen(1);
            expect(gen1.ghost.psychic).toBe(0);
            expect(gen1.poison.bug).toBe(2);
            expect(gen1.bug.poison).toBe(2);
            expect(gen1.ice.fire).toBe(1);
            // No Dark, Steel, Fairy specific resistances/weaknesses in Gen 1
            expect(gen1.fire.fairy).toBe(1); 
        });

        it('should handle Gen 2-5 Steel resistances (Ghost/Dark -> Steel is 0.5x)', () => {
            const gen5 = getTypeMatchupsForGen(5);
            expect(gen5.ghost.steel).toBe(0.5);
            expect(gen5.dark.steel).toBe(0.5);
            // Gen 5 still has no Fairy
            expect(gen5.fire.fairy).toBe(1);
        });

        it('should handle Gen 6+ Steel neutral damage (Ghost/Dark -> Steel is 1x)', () => {
            const gen6 = getTypeMatchupsForGen(6);
            expect(gen6.ghost.steel).toBe(1);
            expect(gen6.dark.steel).toBe(1);
            // Gen 6 has Fairy
            expect(gen6.fire.fairy).toBe(0.5);
            expect(gen6.poison.fairy).toBe(2);
        });
    });

    describe('getTypesForGenList', () => {
        it('should exclude Dark, Steel, Fairy in Gen 1', () => {
            const list = getTypesForGenList(1);
            expect(list).not.toContain('dark');
            expect(list).not.toContain('steel');
            expect(list).not.toContain('fairy');
            expect(list).toContain('fire');
        });

        it('should include Dark, Steel but exclude Fairy in Gen 5', () => {
            const list = getTypesForGenList(5);
            expect(list).toContain('dark');
            expect(list).toContain('steel');
            expect(list).not.toContain('fairy');
        });

        it('should include all types in Gen 9', () => {
            const list = getTypesForGenList(9);
            expect(list).toContain('fairy');
        });
    });

    describe('Pokemon Data Versioning Utilities', () => {
        const mockPokemon = {
            stats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
            statsPast: [
                { genId: 1, stats: { hp: 100, atk: 100, def: 100, special: 150, spe: 100 } },
                { genId: 2, stats: { hp: 100, atk: 100, def: 100, spa: 120, spd: 120, spe: 100 } }
            ],
            types: ['normal', 'fairy'],
            typesPast: [
                { genId: 1, types: ['normal'] },
                { genId: 5, types: ['normal'] }
            ],
            abilities: [{ id: 1, isHidden: false }],
            abilitiesPast: [
                { genId: 3, abilities: [{ id: 2, isHidden: false }] }
            ]
        };

        it('getStatsForGen should handle special stat split in Gen 1', () => {
            const stats = getStatsForGen(mockPokemon, 1);
            expect(stats.spa).toBe(150);
            expect(stats.spd).toBe(150);
        });

        it('getStatsForGen should handle past stat changes', () => {
            const stats = getStatsForGen(mockPokemon, 2);
            expect(stats.spa).toBe(120);
        });

        it('getTypesForGen should handle past type changes', () => {
            const types = getTypesForGen(mockPokemon, 5);
            expect(types).toEqual(['normal']);
            const currentTypes = getTypesForGen(mockPokemon, 9);
            expect(currentTypes).toEqual(['normal', 'fairy']);
        });

        it('getAbilitiesForGen should handle no abilities before Gen 3', () => {
            expect(getAbilitiesForGen(mockPokemon, 2)).toEqual([]);
            expect(getAbilitiesForGen(mockPokemon, 3)).toEqual([{ id: 2, isHidden: false }]);
            expect(getAbilitiesForGen(mockPokemon, 9)).toEqual([{ id: 1, isHidden: false }]);
        });
    });
});
