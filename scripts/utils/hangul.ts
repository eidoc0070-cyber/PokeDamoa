
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
 * 복합 자모를 개별 자모로 분리합니다. (예: ㄳ -> ㄱㅅ, ㄵ -> ㄴㅈ)
 */
const COMPLEX_JAMO: Record<string, string> = {
    'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ',
    'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
    'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ'
};

/**
 * 한글 문자열을 초성/중성/종성으로 분리합니다.
 * @param text 분리할 한글 문자열
 * @param fullyDecompose 복합 자모를 더 잘게 분해할지 여부
 * @returns { disassembled: string, initialConsonants: string }
 */
export function disassembleHangul(text: string, fullyDecompose: boolean = false) {
  let disassembled = '';
  let initialConsonants = '';

  for (const char of text) {
    const code = char.charCodeAt(0);

    if (code >= HANGUL_START && code <= HANGUL_END) {
      const index = code - HANGUL_START;
      const choIdx = Math.floor(index / 588);
      const jungIdx = Math.floor((index % 588) / 28);
      const jongIdx = index % 28;

      let cho = CHO[choIdx];
      let jung = JUNG[jungIdx];
      let jong = JONG[jongIdx];

      if (fullyDecompose) {
          cho = COMPLEX_JAMO[cho] || cho;
          jung = COMPLEX_JAMO[jung] || jung;
          jong = COMPLEX_JAMO[jong] || jong;
      }

      disassembled += cho + jung + jong;
      initialConsonants += cho;
    } else if (code >= 0x3131 && code <= 0x318E) {
        const decomposed = fullyDecompose ? (COMPLEX_JAMO[char] || char) : char;
        disassembled += decomposed;
        if (CHO.includes(char)) {
            initialConsonants += decomposed;
        } else {
            initialConsonants += char;
        }
    } else {
      // 한글이 아닌 경우 그대로 유지
      const lower = char.toLowerCase();
      disassembled += lower;
      initialConsonants += lower;
    }
  }

  return { disassembled, initialConsonants };
}
