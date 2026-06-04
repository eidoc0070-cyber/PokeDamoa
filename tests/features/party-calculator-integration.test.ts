import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as storage from '../../src/state/storage.js';
import * as pokeapi from '../../src/data/pokeapi.js';
import { openPartySelectorModal } from '../../src/features/party-builder/sub-components/PartySelectorModal.js';
import type { Party, PokemonSlot } from '../../src/features/party-builder/types.js';

// DOM Mocking for testing in Bun
if (typeof document === 'undefined') {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).Node = dom.window.Node;
}

describe('Party-Calculator Integration', () => {
    const mockParty: Party = {
        id: '1',
        name: 'Test Party',
        members: [
            {
                pokemonId: 445, // 한카리아스
                level: 50,
                evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
                ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
                natureId: 13, // Jolly (명랑)
                moveIds: [null, null, null, null]
            }
        ] as PokemonSlot[],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    beforeEach(() => {
        document.body.innerHTML = '';
        spyOn(storage, 'loadParties').mockReturnValue([mockParty]);
        spyOn(pokeapi, 'fetchPokedexData').mockResolvedValue([
            { id: 445, nameKo: '한카리아스', nameEn: 'Garchomp', searchKey: '한카리아스' } as any
        ]);
    });

    it('should load parties from storage and display modal', async () => {
        let selectedSlot: PokemonSlot | null = null;
        const onSelect = (slot: PokemonSlot) => {
            selectedSlot = slot;
        };

        await openPartySelectorModal(onSelect);
        
        expect(document.querySelector('h3')?.textContent).toBe('파티에서 불러오기');
        expect(document.body.innerHTML).toContain('한카리아스');
    });

    it('should correctly pass the selected slot to the callback', async () => {
        let selectedSlot: PokemonSlot | null = null;
        const onSelect = (slot: PokemonSlot) => {
            selectedSlot = slot;
        };

        await openPartySelectorModal(onSelect);

        const memberSlot = document.querySelector('.member-slot') as HTMLElement;
        if (memberSlot) {
            memberSlot.click();
            expect(selectedSlot).not.toBeNull();
            const slot = selectedSlot as any as PokemonSlot;
            expect(slot.pokemonId).toBe(445);
            expect(slot.natureId).toBe(13);
            expect(slot.evs.atk).toBe(252);
        }
    });
});
