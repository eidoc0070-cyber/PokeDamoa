/**
 * URL 경로(Path)와 쿼리 스트링(Query String)을 다루는 유틸리티
 */

// 현재 탭 경로 가져오기 (예: /pokedex -> pokedex)
export function getTabFromPath(): string {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    return path || 'settings';
}

// URL 경로 업데이트
export function updatePath(tabName: string) {
    const currentPath = getTabFromPath();
    if (currentPath !== tabName) {
        const url = new URL(window.location.href);
        url.pathname = `/${tabName}`;
        url.search = ''; // 다른 탭으로 이동 시 이전 탭의 Query String 초기화
        window.history.pushState({}, '', url.toString());
    }
}

// 쿼리 파라미터 가져오기 (전체 객체 반환)
export function getQueryParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}

// 쿼리 파라미터 업데이트
export function updateQueryParams(params: Record<string, string | number | boolean>) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, '', url.toString());
}

// 현재 전체 상태 URL 반환 (공유용)
export function getCurrentStateUrl(): string {
    return window.location.href;
}

// URL로부터 상태 복원 (탭 이동 + 쿼리 스트링)
export function restoreStateFromUrl(urlStr: string) {
    try {
        const url = new URL(urlStr);
        const tab = url.pathname.replace(/^\/|\/$/g, '') || 'settings';
        // 이 함수를 호출하는 곳에서 탭 이동 및 데이터 복원을 처리해야 함
        return { tab, params: Object.fromEntries(url.searchParams.entries()) };
    } catch (e) {
        console.error('URL 파싱 실패:', e);
        return null;
    }
}
