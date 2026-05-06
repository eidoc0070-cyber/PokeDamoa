
import { describe, it, expect } from 'bun:test'; // vitest -> bun:test
import { disassembleHangul, hangulIncludes } from '../src/utils/hangul.js';

describe('Hangul Utility', () => {
  describe('disassembleHangul', () => {
    it('should disassemble Hangul characters correctly', () => {
      const { disassembled, initialConsonants } = disassembleHangul('피카츄');
      expect(disassembled).toBe('ㅍㅣㅋㅏㅊㅠ');
      expect(initialConsonants).toBe('ㅍㅋㅊ');
    });

    it('should handle complex batchim', () => {
      const { disassembled } = disassembleHangul('닭');
      expect(disassembled).toBe('ㄷㅏㄺ');
    });

    it('should handle non-Hangul characters', () => {
      const { disassembled, initialConsonants } = disassembleHangul('Pikachu123!');
      expect(disassembled).toBe('pikachu123!');
      expect(initialConsonants).toBe('pikachu123!');
    });

    it('should handle mixed characters', () => {
      const { disassembled, initialConsonants } = disassembleHangul('물포켓몬ABC');
      expect(disassembled).toBe('ㅁㅜㄹㅍㅗㅋㅔㅅㅁㅗㄴabc');
      expect(initialConsonants).toBe('ㅁㅍㅋㅁabc');
    });
  });

  describe('hangulIncludes', () => {
    // Mock searchKey: "이름|영문명|분해|초성"
    const pikachuSearchKey = '피카츄|pikachu|ㅍㅣㅋㅏㅊㅠ|ㅍㅋㅊ';

    it('should match full name', () => {
      expect(hangulIncludes(pikachuSearchKey, '피카츄')).toBe(true);
    });

    it('should match partial name', () => {
      expect(hangulIncludes(pikachuSearchKey, '카츄')).toBe(true);
    });

    it('should match initial consonants', () => {
      expect(hangulIncludes(pikachuSearchKey, 'ㅍㅋㅊ')).toBe(true);
      expect(hangulIncludes(pikachuSearchKey, 'ㅍㅋ')).toBe(true);
    });

    it('should match disassembled parts', () => {
      expect(hangulIncludes(pikachuSearchKey, 'ㅍㅣㅋ')).toBe(true);
    });

    it('should match query that needs disassembly (incremental search)', () => {
      // "핔" disassembles to "ㅍㅣㅋ", which is in "피카츄"
      expect(hangulIncludes(pikachuSearchKey, '핔')).toBe(true);
      // "카" matches
      expect(hangulIncludes(pikachuSearchKey, 'ㅋㅏ')).toBe(true);
    });

    it('should match fully decomposed jamo', () => {
        // "ㄲ" -> "ㄱㄱ"
        const kkakSearchKey = '깎다|kkakda|ㄲㅏㄲㄷㅏ|ㄲㄷ';
        expect(hangulIncludes(kkakSearchKey, 'ㄱㄱㅏㄱㄱ')).toBe(true);
        expect(hangulIncludes(kkakSearchKey, 'ㄲㅏㄲ')).toBe(true);
    });

    it('should match complex jamo in query even if not in target searchKey', () => {
        const raichuSearchKey = '라이츄|raichu|ㄹㅏㅇㅣㅊㅠ|ㄹㅇㅊ';
        // "ㄹㅏㅇ" matches "ㄹㅏㅇㅣㅊㅠ"
        expect(hangulIncludes(raichuSearchKey, 'ㄹㅏㅇ')).toBe(true);
        // "ㄹㅏㅇㅣ" matches
        expect(hangulIncludes(raichuSearchKey, 'ㄹㅏㅇㅣ')).toBe(true);
    });

    it('should match when target is just a raw Hangul string', () => {
        expect(hangulIncludes('망나뇽', 'ㅁㄴㄴ')).toBe(true);
        expect(hangulIncludes('망나뇽', 'ㅁㅏㅇㄴㅏ')).toBe(true);
        expect(hangulIncludes('망나뇽', 'ㅁㅏㅇㄴㅏㄴㅛㅇ')).toBe(true);
    });

    it('should handle double consonants correctly', () => {
        expect(hangulIncludes('꼬부기', 'ㄲㅂㄱ')).toBe(true);
        expect(hangulIncludes('꼬부기', 'ㄱㄱㅂㄱ')).toBe(true); // Fully decomposed
        expect(hangulIncludes('꼬부기', 'ㄲㅗ')).toBe(true);
        expect(hangulIncludes('꼬부기', 'ㄱㄱㅗ')).toBe(true);
    });

    it('should handle complex batchim correctly', () => {
        expect(hangulIncludes('래비풋', 'ㄹㅐㅂㅣㅍㅜㅅ')).toBe(true);
        // "ㄹㅐㅂㅣㅍㅜㅅ" contains "ㅍㅜㅅ"
        // If query is "ㅍㅜㅅ", it should match.
        // If target has "ㅅ" but query has "ㅅㅅ"(ㅆ), it should NOT match.
        expect(hangulIncludes('래비풋', 'ㅍㅜㅅ')).toBe(true);
    });

    it('should handle mixed initial consonants and full characters (now supported via fuzzy)', () => {
        // Now supported via fuzzy matching
        expect(hangulIncludes('피카츄', 'ㅍㅣㅋㅊ')).toBe(true);
    });

    it('should match English name', () => {
      expect(hangulIncludes(pikachuSearchKey, 'pika')).toBe(true);
    });

    it('should not match unrelated query', () => {
      expect(hangulIncludes(pikachuSearchKey, '라이츄')).toBe(false);
      expect(hangulIncludes(pikachuSearchKey, 'ㄹㅇㅊ')).toBe(false);
    });

    it('should handle empty or whitespace query', () => {
      expect(hangulIncludes(pikachuSearchKey, '')).toBe(true);
      expect(hangulIncludes(pikachuSearchKey, '   ')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(hangulIncludes(pikachuSearchKey, 'PIKA')).toBe(true);
    });
    
    it('should match numeric characters', () => {
        const polySearchKey = '폴리곤2|porygon2|ㅍㅗㄹㄹㅣㄱㅗㄴ2|ㅍㄹㄱ2';
        expect(hangulIncludes(polySearchKey, '2')).toBe(true);
        expect(hangulIncludes(polySearchKey, 'ㅍㄹㄱ2')).toBe(true);
    });
  });
});
