/**
 * 로컬 스토리지(localStorage) 관리 유틸리티
 */

export const SETTINGS_KEY = 'pokedamoa_settings';
export const EXTERNAL_LINKS_KEY = 'pokedamoa_external_links';
const PRESETS_KEY = 'pokedamoa_presets';

export interface TabItem {
    id: string; // 고유 ID (URL 파라미터 등에서 참조)
    currentName: string; // 표시될 이름
    isVisible: boolean; // 노출 여부
    isCustomized?: boolean | undefined; // 사용자가 수동으로 수정한 적이 있는지 여부
}

export const DEFAULT_TABS: TabItem[] = [
    { id: 'pokedex', currentName: '📚 정보 도감', isVisible: true, isCustomized: false },
    { id: 'calculator', currentName: '🧮 계산기', isVisible: true, isCustomized: false },
    { id: 'external-links', currentName: '🔗 외부 링크', isVisible: true, isCustomized: true },
    { id: 'settings', currentName: '⚙️ 설정', isVisible: true, isCustomized: false },
];

export interface SavedSettings {
    isDarkMode: boolean;
    isCustomMode: boolean;
    generation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'champions';
    externalLinks?: any[] | undefined; // 외부 링크 데이터 포함 가능
    tabs?: TabItem[] | undefined; // 상단 탭 설정
    visitCount?: number | undefined;
    pwaGuideDismissed?: boolean | undefined;
}

// 설정 저장
export function saveSettings(settings: SavedSettings) {
    const { externalLinks, ...coreSettings } = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(coreSettings));
    if (externalLinks) {
        localStorage.setItem(EXTERNAL_LINKS_KEY, JSON.stringify(externalLinks));
    }
}

// 외부 링크만 가져오기
export function getExternalLinks(): any[] | null {
    const data = localStorage.getItem(EXTERNAL_LINKS_KEY);
    return data ? JSON.parse(data) : null;
}

// 설정 불러오기
export function loadSettings(): SavedSettings | null {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('설정 로드 실패:', e);
        return null;
    }
}

// 프리셋(자주 쓰는 세팅) 저장/불러오기 기능
export function savePreset(name: string, state: any) {
    const presets = loadPresets();
    presets[name] = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function loadPresets(): Record<string, any> {
    const data = localStorage.getItem(PRESETS_KEY);
    try {
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
}

export function deletePreset(name: string) {
    const presets = loadPresets();
    delete presets[name];
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}
