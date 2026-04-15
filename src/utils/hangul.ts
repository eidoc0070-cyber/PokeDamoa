
const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];
const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

const HANGUL_START = 0xAC00;
const HANGUL_END = 0xD7A3;

/**
 * 한글 문자열을 초성/중성/종성으로 분리합니다.
 */
export function disassembleHangul(text: string) {
  let disassembled = '';
  let initialConsonants = '';

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code >= HANGUL_START && code <= HANGUL_END) {
      const index = code - HANGUL_START;
      const choIndex = Math.floor(index / 588);
      const jungIndex = Math.floor((index % 588) / 28);
      const jongIndex = index % 28;

      disassembled += CHO[choIndex] + JUNG[jungIndex] + JONG[jongIndex];
      initialConsonants += CHO[choIndex];
    } else {
      disassembled += char.toLowerCase();
      initialConsonants += char.toLowerCase();
    }
  }

  return { disassembled, initialConsonants };
}

/**
 * 검색어가 대상 텍스트에 포함되는지 확인합니다. (초성 검색 및 자소 분리 대응)
 * @param targetSearchKey 미리 계산된 searchKey (이름|영문명|분해|초성)
 * @param query 사용자가 입력한 검색어
 */
export function hangulIncludes(targetSearchKey: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const { disassembled, initialConsonants } = disassembleHangul(normalizedQuery);
  
  // targetSearchKey는 [이름|영문명|분해|초성] 형태
  const parts = targetSearchKey.toLowerCase().split('|');
  
  // 1. 원본 이름에 포함되는지 (이름|영문명)
  if (parts[0]?.includes(normalizedQuery) || parts[1]?.includes(normalizedQuery)) return true;
  
  // 2. 분해된 텍스트에 포함되는지
  if (parts[2]?.includes(disassembled)) return true;
  
  // 3. 초성에 포함되는지
  if (parts[3]?.includes(disassembled)) return true; // disassembled가 초성만 있을 경우를 위해

  return false;
}
