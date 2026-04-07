/**
 * 로컬 스토리지(localStorage) 관리 유틸리티
 */

export const SETTINGS_KEY = 'pokedamoa_settings';
export const EXTERNAL_LINKS_KEY = 'pokedamoa_external_links';
const PRESETS_KEY = 'pokedamoa_presets';

export interface SavedSettings {
    isDarkMode: boolean;
    isCustomMode: boolean;
    generation: 9 | 'champions';
    externalLinks?: any[]; // 외부 링크 데이터 포함 가능
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
    return data ? JSON.parse(data) : null;
}

// 프리셋(자주 쓰는 세팅) 저장/불러오기 기능 (확장성 위해)
export function savePreset(name: string, state: any) {
    const presets = loadPresets();
    presets[name] = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function loadPresets(): Record<string, any> {
    const data = localStorage.getItem(PRESETS_KEY);
    return data ? JSON.parse(data) : {};
}

export function deletePreset(name: string) {
    const presets = loadPresets();
    delete presets[name];
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}
