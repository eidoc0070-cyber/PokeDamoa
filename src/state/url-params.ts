/**
 * URL 경로(Path)와 쿼리 스트링(Query String)을 다루는 유틸리티
 */

export interface PathInfo {
    mainTab: string;
    subTab?: string | undefined;
}

// 현재 탭 경로 가져오기 (예: /pokedex/pokemon -> { mainTab: 'pokedex', subTab: 'pokemon' })
export function getTabFromPath(): PathInfo {
    const pathParts = window.location.pathname.replace(/^\/|\/$/g, "").split("/");
    return {
        mainTab: pathParts[0] || "settings",
        subTab: pathParts[1], // 없을 수도 있음
    };
}

// URL 경로 업데이트
export function updatePath(mainTab: string, subTab?: string) {
    const info = getTabFromPath();
    if (info.mainTab !== mainTab || info.subTab !== subTab) {
        const url = new URL(window.location.href);
        url.pathname = subTab ? `/${mainTab}/${subTab}` : `/${mainTab}`;

        // 메인 탭이 바뀌면 이전 탭의 Query String 초기화, 서브 탭만 바뀌면 유지
        if (info.mainTab !== mainTab) {
            url.search = "";
        }

        window.history.pushState({}, "", url.toString());
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
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, "", url.toString());
}

// 현재 전체 상태 URL 반환 (공유용)
export function getCurrentStateUrl(): string {
    return window.location.href;
}

// URL로부터 상태 복원 (탭 이동 + 쿼리 스트링)
export function restoreStateFromUrl(urlStr: string) {
    if (!urlStr?.startsWith("http")) return null;
    try {
        const url = new URL(urlStr);
        const pathParts = url.pathname.replace(/^\/|\/$/g, "").split("/");
        const mainTab = pathParts[0] || "settings";
        const subTab = pathParts[1];
        return { mainTab, subTab, params: Object.fromEntries(url.searchParams.entries()) };
    } catch (_e) {
        return null;
    }
}
