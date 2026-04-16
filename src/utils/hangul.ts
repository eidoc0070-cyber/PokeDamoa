/**
 * 한글 분리 유틸리티
 */

const CHO = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];
const JUNG = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];
const JONG = [
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

/**
 * 한글 유니코드에서 초성, 중성, 종성을 분리합니다.
 */
export function disassembleHangul(str: string): { disassembled: string; initialConsonants: string } {
    let disassembled = '';
    let initialConsonants = '';

    const normalized = str.toLowerCase();

    for (let i = 0; i < normalized.length; i++) {
        const charCode = normalized.charCodeAt(i);
        const code = charCode - 44032;

        if (code >= 0 && code <= 11171) {
            const cho = Math.floor(code / 588);
            const jung = Math.floor((code % 588) / 28);
            const jong = code % 28;

            disassembled += CHO[cho] + JUNG[jung] + JONG[jong];
            initialConsonants += CHO[cho];
        } else {
            disassembled += normalized.charAt(i);
            initialConsonants += normalized.charAt(i);
        }
    }

    return { disassembled, initialConsonants };
}

/**
 * 한글 문자열에서 초성만 추출합니다.
 */
export function getChosung(str: string): string {
    return disassembleHangul(str).initialConsonants;
}

/**
 * 검색 대상 문자열이 쿼리를 포함하는지 확인합니다.
 */
export function hangulIncludes(target: string, query: string): boolean {
    const trimmedQuery = query.toLowerCase().trim();
    if (!trimmedQuery) return true;

    const normalizedTarget = target.toLowerCase();
    
    // 단순 포함 여부 확인
    if (normalizedTarget.includes(trimmedQuery)) return true;

    // 분해된 문자열이나 초성 포함 여부 확인
    const { disassembled, initialConsonants } = disassembleHangul(normalizedTarget);
    if (disassembled.includes(trimmedQuery)) return true;
    if (initialConsonants.includes(trimmedQuery)) return true;

    return false;
}
