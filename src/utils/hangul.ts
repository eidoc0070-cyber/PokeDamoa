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
 */
export function disassembleHangul(str: string, fullyDecompose: boolean = false): { disassembled: string; initialConsonants: string } {
    let disassembled = '';
    let initialConsonants = '';

    const normalized = str.toLowerCase();

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charAt(i);
        const charCode = normalized.charCodeAt(i);

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
        else if (charCode >= 0x3131 && charCode <= 0x318E) {
            const decomposed = fullyDecompose ? (COMPLEX_JAMO[char] || char) : char;
            disassembled += decomposed;
            if (CHO.includes(char)) {
                initialConsonants += decomposed;
            } else {
                initialConsonants += decomposed; // 초성이 아닌 자모 단독 입력 시에도 분해 적용
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
 * 최적화된 Levenshtein Distance 알고리즘 (Early Exit 적용)
 */
export function getLevenshteinDistance(a: string, b: string, limit: number): number {
    const n = a.length;
    const m = b.length;
    if (Math.abs(n - m) > limit) return limit + 1;

    let prev = Array.from({ length: m + 1 }, (_, i) => i);
    let curr = new Array(m + 1);

    for (let i = 1; i <= n; i++) {
        curr[0] = i;
        let minInRow = curr[0];
        for (let j = 1; j <= m; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
            if (curr[j] < minInRow) minInRow = curr[j];
        }
        if (minInRow > limit) return limit + 1;
        [prev, curr] = [curr, prev];
    }
    return prev[m];
}

/**
 * 검색 대상 문자열이 쿼리를 포함하는지 확인합니다. (자소 분리 검색 지원)
 * @param target 대상 문자열 (이미 searchKey 형태일 수 있음)
 * @param query 검색어
 * @param allowFuzzy 오타 허용 여부
 */
export function hangulIncludes(target: string, query: string, allowFuzzy: boolean = true): boolean {
    const term = query.toLowerCase().trim();
    if (!term) return true;
    
    // searchKey 형태(이름|영문|분해|초성)인지 확인
    let nameKo = target;
    let disassembled = '';
    let chosung = '';
    
    if (target.includes('|')) {
        const parts = target.split('|');
        nameKo = parts[0];
        disassembled = parts[2] || '';
        chosung = parts[3] || '';
    }

    const targetLower = nameKo.toLowerCase();
    if (targetLower.includes(term)) return true;

    // 일반 분해 비교
    const queryInfo = disassembleHangul(term);
    if (!disassembled) {
        const targetInfo = disassembleHangul(targetLower);
        disassembled = targetInfo.disassembled;
        chosung = targetInfo.initialConsonants;
    }

    if (disassembled.includes(queryInfo.disassembled)) return true;
    if (chosung.includes(queryInfo.disassembled)) return true;

    // 완전 분해(fullyDecompose) 비교 (ㄲ -> ㄱㄱ 등)
    const queryFull = disassembleHangul(term, true).disassembled;
    const targetFull = disassembleHangul(targetLower, true).disassembled;
    if (targetFull.includes(queryFull)) return true;

    // 오타 허용 (Fuzzy)
    if (allowFuzzy && term.length >= 2) {
        const queryDis = queryInfo.disassembled;
        const maxDist = Math.max(1, Math.min(2, Math.floor(queryDis.length / 3)));
        
        // 전체 또는 부분 오타 허용 확인
        const dist = getLevenshteinDistance(disassembled, queryDis, maxDist);
        if (dist <= maxDist) return true;
        
        const subDist = getLevenshteinDistance(disassembled.substring(0, queryDis.length), queryDis, maxDist);
        if (subDist <= maxDist) return true;
    }

    return false;
}

export interface SearchResult<T> {
    item: T;
    score: number; // 높을수록 일치도가 높음 (100: 정확히 일치, 0: 불일치)
}

/**
 * 자소 분리 및 오타 허용 기반의 통합 검색 함수
 */
export function searchFuzzy<T>(
    data: T[],
    query: string,
    getSearchFields: (item: T) => { nameKo: string; nameEn: string; disassembled: string; chosung: string }
): SearchResult<T>[] {
    const term = query.toLowerCase().trim();
    if (!term) return data.map(item => ({ item, score: 0 }));

    const queryInfo = disassembleHangul(term);
    const queryFull = disassembleHangul(term, true).disassembled;
    const isChosungQuery = term.split('').every(char => CHO.includes(char) || (char >= 'ㄱ' && char <= 'ㅎ' && !JUNG.includes(char)));

    return data
        .map(item => {
            const { nameKo, nameEn, disassembled, chosung } = getSearchFields(item);
            const targetKo = nameKo.toLowerCase();
            const targetEn = nameEn.toLowerCase();
            
            let score = 0;

            // 1. 정확한 일치
            if (targetKo === term || targetEn === term) score = 100;
            // 2. 시작 부분 일치
            else if (targetKo.startsWith(term) || targetEn.startsWith(term)) score = 80;
            // 3. 자소 분리 시작 부분 일치
            else if (disassembled && disassembled.startsWith(queryInfo.disassembled)) score = 70;
            // 4. 초성 일치
            else if (isChosungQuery && chosung && chosung.includes(queryInfo.disassembled)) score = 60;
            // 5. 단순 포함
            else if (targetKo.includes(term) || targetEn.includes(term)) score = 50;
            // 6. 자소 분리 포함
            else if (disassembled && disassembled.includes(queryInfo.disassembled)) score = 40;
            
            // 아직 점수가 없거나 낮은 경우 오타 허용 로직 적용
            if (score < 40 && term.length >= 2) {
                const queryDis = queryInfo.disassembled;
                const targetDis = disassembled || disassembleHangul(targetKo).disassembled;
                
                const maxDist = Math.max(1, Math.min(2, Math.floor(queryDis.length / 3)));
                
                // 전체 비교
                const dist = getLevenshteinDistance(targetDis, queryDis, maxDist);
                if (dist <= maxDist) {
                    score = Math.max(score, 35 - dist);
                } 
                // 부분(앞부분) 비교
                else {
                    const targetSub = targetDis.substring(0, queryDis.length);
                    const subDist = getLevenshteinDistance(targetSub, queryDis, maxDist);
                    if (subDist <= maxDist) {
                        score = Math.max(score, 30 - subDist);
                    }
                }

                // 완전 분해(ㄲ->ㄱㄱ) 포함 여부도 최종 확인
                if (score < 38) {
                    const targetFull = disassembleHangul(targetKo, true).disassembled;
                    if (targetFull.includes(queryFull)) score = 38;
                }
            }

            return { item, score };
        })
        .filter(res => res.score > 0)
        .sort((a, b) => b.score - a.score);
}

