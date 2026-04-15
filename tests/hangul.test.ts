
import { describe, it, expect } from 'vitest';
import { disassembleHangul, hangulIncludes } from '../src/utils/hangul';

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
