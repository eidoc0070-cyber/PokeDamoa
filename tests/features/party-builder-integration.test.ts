import { describe, it, expect } from 'bun:test';
import { parseShowdown, exportShowdown } from '../../src/features/party-builder/parser.js';
import type { PokemonSlot } from '../../src/features/party-builder/types.js';

describe('Party Builder Integration & Edge Cases', () => {
    const mockCtx = {
        pokemon: [
            { id: 1, nameKo: '이상해씨', nameEn: 'Bulbasaur' },
            { id: 25, nameKo: '피카츄', nameEn: 'Pikachu' }
        ],
        items: [
            { id: 1, nameKo: '마스터볼', nameEn: 'Master Ball' },
            { id: 231, nameKo: '기합의띠', nameEn: 'Focus Sash' }
        ],
        moves: [
            { id: 1, nameKo: '막치기', nameEn: 'Pound' },
            { id: 85, nameKo: '10만볼트', nameEn: 'Thunderbolt' }
        ],
        abilities: [
            { id: 1, nameKo: '악취', nameEn: 'Stench' },
            { id: 9, nameKo: '정전기', nameEn: 'Static' }
        ]
    };

    it('should handle nicknames and gender correctly', () => {
        const text = `Pika (Pikachu) (M) @ Focus Sash
Ability: Static
EVs: 252 Atk / 252 Spe
Jolly Nature
- Thunderbolt`;
        const slots = parseShowdown(text, mockCtx);
        const slot = slots[0];
        if (!slot) throw new Error('Slot should exist');

        expect(slot.nickname).toBe('Pika');
        expect(slot.pokemonId).toBe(25);
        expect(slot.gender).toBe('M');
        expect(slot.itemId).toBe(231);
    });

    it('should handle empty or unknown fields gracefully', () => {
        const text = `UnknownPokemon @ UnknownItem
- UnknownMove`;
        const slots = parseShowdown(text, mockCtx);
        // ID 0 represents not found
        expect(slots.length).toBe(0); // If species not found, slot is skipped
    });

    it('should parse multiple Pokémon in one paste', () => {
        const text = `Bulbasaur
- Pound

Pikachu
- Thunderbolt`;
        const slots = parseShowdown(text, mockCtx);
        expect(slots.length).toBe(2);
        
        const slot1 = slots[0];
        const slot2 = slots[1];
        if (!slot1 || !slot2) throw new Error('Slots should exist');

        expect(slot1.pokemonId).toBe(1);
        expect(slot2.pokemonId).toBe(25);
    });

    it('should maintain data integrity through export-import cycle', () => {
        const originalSlot: PokemonSlot = {
            pokemonId: 25,
            nickname: 'Sparky',
            itemId: 231,
            abilityId: 9,
            moveIds: [85, null, null, null],
            evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            natureId: 13, // Jolly
            level: 50,
            gender: 'M',
            isShiny: true
        };

        const exported = exportShowdown(originalSlot, mockCtx, 'ko');
        const imported = parseShowdown(exported, mockCtx)[0];
        if (!imported) throw new Error('Imported slot should exist');

        expect(imported.pokemonId).toBe(originalSlot.pokemonId);
        expect(imported.nickname).toBe(originalSlot.nickname);
        expect(imported.itemId).toBe(originalSlot.itemId);
        expect(imported.abilityId).toBe(originalSlot.abilityId);
        expect(imported.evs.atk).toBe(originalSlot.evs.atk);
        expect(imported.natureId).toBe(originalSlot.natureId);
        expect(imported.level).toBe(originalSlot.level);
        expect(imported.isShiny).toBe(true);
    });
});
