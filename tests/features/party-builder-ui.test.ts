import { describe, it, expect, beforeEach } from 'bun:test';
import { renderPartyEditor } from '../../src/features/party-builder/sub-components/PartyEditor.js';
import type { Party } from '../../src/features/party-builder/types.js';

describe('PartyEditor UI', () => {
    let container: HTMLElement;
    const mockCtx = {
        pokemon: [{ id: 1, nameKo: '이상해씨', nameEn: 'Bulbasaur', searchKey: 'ㅇㅅㅎㅆ' }],
        items: [{ id: 1, nameKo: '마스터볼', nameEn: 'Master Ball', searchKey: 'ㅁㅅㅌㅂ' }],
        moves: [{ id: 1, nameKo: '막치기', nameEn: 'Pound', searchKey: 'ㅁㅊㄱ' }],
        abilities: [{ id: 1, nameKo: '악취', nameEn: 'Stench', searchKey: 'ㅇㅊ' }]
    };

    const mockParty: Party = {
        id: '1',
        name: '테스트 파티',
        members: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('should toggle between visual and text mode', () => {
        renderPartyEditor(container, mockParty, mockCtx as any, () => {}, () => {});
        
        const btnText = container.querySelector('#btn-mode-text') as HTMLButtonElement;
        btnText.click();
        
        expect(container.querySelector('#text-editor')).not.toBeNull();
        
        const btnVisual = container.querySelector('#btn-mode-visual') as HTMLButtonElement;
        btnVisual.click();
        
        expect(container.querySelector('#slots-container')).not.toBeNull();
    });

    it('should sync text editor changes to party members', (done) => {
        renderPartyEditor(container, mockParty, mockCtx as any, () => {}, () => {});
        
        // 텍스트 모드로 전환
        (container.querySelector('#btn-mode-text') as HTMLButtonElement).click();
        
        const textarea = container.querySelector('#text-editor') as HTMLTextAreaElement;
        textarea.value = '이상해씨 @ 마스터볼\n특성: 악취\n- 막치기';
        textarea.dispatchEvent(new Event('input'));
        
        // 디바운스 대기 (1초보다 조금 더 길게)
        setTimeout(() => {
            expect(mockParty.members[0]?.pokemonId).toBe(1);
            expect(mockParty.members[0]?.itemId).toBe(1);
            expect(mockParty.members[0]?.moveIds[0]).toBe(1);
            done();
        }, 1100);
    });
});
