
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
 * @param text 분리할 한글 문자열
 * @returns { disassembled: string, initialConsonants: string }
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
      // 한글이 아닌 경우 그대로 유지
      disassembled += char;
      initialConsonants += char;
    }
  }

  return { disassembled, initialConsonants };
}
