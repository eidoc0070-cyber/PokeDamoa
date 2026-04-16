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
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

/**
 * 복합 자모를 개별 자모로 분리합니다. (예: ㄳ -> ㄱㅅ, ㄵ -> ㄴㅈ)
 */
const COMPLEX_JAMO: Record<string, string> = {
    'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ',
    'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
    'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ'
};

/**
 * 문자열을 자소 단위로 완전히 분해합니다.
 * @param str 분해할 문자열
 * @param fullyDecompose 복합 자모(ㄲ, ㄳ 등)를 더 잘게 분해할지 여부
 */
export function disassembleHangul(str: string, fullyDecompose: boolean = false): { disassembled: string; initialConsonants: string } {
    let disassembled = '';
    let initialConsonants = '';

    const normalized = str.toLowerCase();

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charAt(i);
        const charCode = normalized.charCodeAt(i);

        // 한글 말마디 (Syllables) 범위: 0xAC00 ~ 0xD7A3
        if (charCode >= 44032 && charCode <= 55203) {
            const code = charCode - 44032;
            const choIdx = Math.floor(code / 588);
            const jungIdx = Math.floor((code % 588) / 28);
            const jongIdx = code % 28;

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
        } 
        // 한글 자모 (Compatibility Jamo) 범위: 0x3131 ~ 0x318E
        else if (charCode >= 0x3131 && charCode <= 0x318E) {
            const decomposed = fullyDecompose ? (COMPLEX_JAMO[char] || char) : char;
            disassembled += decomposed;
            // 자음인 경우에만 초성으로 취급 (초성 범위에 있는 것들)
            if (CHO.includes(char)) {
                initialConsonants += decomposed;
            } else {
                initialConsonants += char;
            }
        }
        else {
            disassembled += char;
            initialConsonants += char;
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
 * 검색 대상 문자열이 쿼리를 포함하는지 확인합니다. (자소 분리 검색 지원)
 */
export function hangulIncludes(target: string, query: string): boolean {
    const trimmedQuery = query.toLowerCase().trim();
    if (!trimmedQuery) return true;

    // 1. 단순 포함 여부 확인 (원본 그대로 비교)
    const normalizedTarget = target.toLowerCase();
    if (normalizedTarget.includes(trimmedQuery)) return true;

    // 2. 쿼리와 대상을 자소 분리하여 비교
    // target이 이미 searchKey 형태일 수 있으므로(피카츄|pikachu|ㅍㅣㅋㅏㅊㅠ|ㅍㅋㅊ),
    // target에 대해 disassemble을 다시 해도 결과는 안정적입니다.
    const { disassembled: targetDis, initialConsonants: targetCho } = disassembleHangul(normalizedTarget);
    const { disassembled: queryDis, initialConsonants: queryCho } = disassembleHangul(trimmedQuery);

    // 자소 분리된 문자열 비교
    if (targetDis.includes(queryDis)) return true;

    // 초성 검색 확인 (사용자가 초성만 입력했을 경우)
    // queryCho와 queryDis가 같으면(즉, 쿼리가 자음으로만 구성되었으면) 초성 검색으로 간주
    if (queryDis === queryCho && targetCho.includes(queryCho)) return true;

    // 완전 분해(fullyDecompose) 비교 (ㄲ -> ㄱㄱ 등)
    const { disassembled: targetFull } = disassembleHangul(normalizedTarget, true);
    const { disassembled: queryFull } = disassembleHangul(trimmedQuery, true);
    if (targetFull.includes(queryFull)) return true;

    return false;
}

