
import { describe, it, expect } from 'bun:test';
import { searchFuzzy } from '../src/utils/hangul';

describe('Fuzzy Search Improvement', () => {
    const mockData = [
        { nameKo: '피카츄', nameEn: 'pikachu', searchKey: '피카츄|pikachu|ㅍㅣㅋㅏㅊㅠ|ㅍㅋㅊ', d: 'ㅍㅣㅋㅏㅊㅠ', c: 'ㅍㅋㅊ' },
        { nameKo: '라이츄', nameEn: 'raichu', searchKey: '라이츄|raichu|ㄹㅏㅇㅣㅊㅠ|ㄹㅇㅊ', d: 'ㄹㅏㅇㅣㅊㅠ', c: 'ㄹㅇㅊ' },
        { nameKo: '파이리', nameEn: 'charmander', searchKey: '파이리|charmander|ㅍㅏㅇㅣㄹㅣ|ㅍㅇㄹ', d: 'ㅍㅏㅇㅣㄹㅣ', c: 'ㅍㅇㄹ' },
        { nameKo: '꼬부기', nameEn: 'squirtle', searchKey: '꼬부기|squirtle|ㄲㅗㅂㅜㄱㅣ|ㄲㅂㄱ', d: 'ㄲㅗㅂㅜㄱㅣ', c: 'ㄲㅂㄱ' }
    ];

    const getFields = (item: any) => ({
        nameKo: item.nameKo,
        nameEn: item.nameEn,
        disassembled: item.d,
        chosung: item.c
    });

    it('should find "피카츄" when searching for "피가츄" (Direct typo)', () => {
        const results = searchFuzzy(mockData, '피가츄', getFields);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.nameKo).toBe('피카츄');
        expect(results[0].score).toBe(34); // 35 - 1 (dist)
    });

    it('should find "피카츄" when searching for "피가" (Prefix typo)', () => {
        const results = searchFuzzy(mockData, '피가', getFields);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.nameKo).toBe('피카츄');
        expect(results[0].score).toBe(29); // 30 - 1 (dist)
    });

    it('should find "꼬부기" when searching for "꼬부디" (End typo)', () => {
        const results = searchFuzzy(mockData, '꼬부디', getFields);
        expect(results[0].item.nameKo).toBe('꼬부기');
    });

    it('should find "파이리" when searching for "파이ㄹ" (Partial disassembled typo)', () => {
        const results = searchFuzzy(mockData, '파이ㄹ', getFields);
        // "파이ㄹ" -> "ㅍㅏㅇㅣㄹ" (5 jamos)
        // "파이리" -> "ㅍㅏㅇㅣㄹㅣ" (6 jamos)
        // Starts with match OR typo match
        expect(results[0].item.nameKo).toBe('파이리');
    });

    it('should maintain priority: Exact > Prefix > Inclusion > Fuzzy', () => {
        const results = searchFuzzy(mockData, '파', getFields);
        expect(results[0].item.nameKo).toBe('파이리'); // Prefix match (80)
        
        const fuzzyResults = searchFuzzy(mockData, '피가츄', getFields);
        expect(fuzzyResults[0].score).toBeLessThan(40); // Fuzzy should be lower than inclusion (40)
    });
});
