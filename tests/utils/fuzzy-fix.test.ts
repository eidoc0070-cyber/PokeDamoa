
import { describe, it, expect } from 'bun:test';
import { hangulIncludes, searchFuzzy } from '../../src/utils/hangul.js';

describe('Global Search Fix Verification', () => {
    const pikachuSearchKey = '피카츄|pikachu|ㅍㅣㅋㅏㅊㅠ|ㅍㅋㅊ';

    describe('hangulIncludes with Fuzzy', () => {
        it('should return true for "피가츄" when target is "피카츄" (searchKey style)', () => {
            expect(hangulIncludes(pikachuSearchKey, '피가츄')).toBe(true);
        });

        it('should return true for "피가" (prefix typo) when target is "피카츄"', () => {
            expect(hangulIncludes(pikachuSearchKey, '피가')).toBe(true);
        });

        it('should return true for raw string "피카츄" when searching "피가츄"', () => {
            expect(hangulIncludes('피카츄', '피가츄')).toBe(true);
        });
    });

    describe('searchFuzzy prioritization', () => {
        const mockData = [
            { nameKo: '피카츄', nameEn: 'pikachu', d: 'ㅍㅣㅋㅏㅊㅠ', c: 'ㅍㅋㅊ' },
            { nameKo: '라이츄', nameEn: 'raichu', d: 'ㄹㅏㅇㅣㅊㅠ', c: 'ㄹㅇㅊ' }
        ];
        const getFields = (item: any) => ({
            nameKo: item.nameKo,
            nameEn: item.nameEn,
            disassembled: item.d,
            chosung: item.c
        });

        it('should prioritize exact match over fuzzy match', () => {
            const results = searchFuzzy(mockData, '피카츄', getFields);
            expect(results[0]!.item.nameKo).toBe('피카츄');
            expect(results[0]!.score).toBe(100);
            });

            it('Should handle simple typos (Fuzzy Search)', () => {
            const results = searchFuzzy(mockData, '피카추', getFields);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0]!.item.nameKo).toBe('피카츄');
            expect(results[0]!.score).toBe(34);
            });
    });
});
