import type { TabItem } from "./storage.js";
import { DEFAULT_TABS } from "./storage.js";

/**
 * 전역 상태 관리를 위한 간단한 Store (Vanilla TS 전용)
 * 옵저버 패턴을 사용하여 상태 변경 시 리스너(컴포넌트)들을 호출합니다.
 */
export class Store<T> {
    private state: T;
    private listeners: Set<(state: T) => void> = new Set();

    constructor(initialState: T) {
        this.state = initialState;
    }

    getState(): T {
        return this.state;
    }

    setState(newState: Partial<T>) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener: (state: T) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener); // 구독 해제 함수 반환
    }

    private notify() {
        // biome-ignore lint/suspicious/useIterableCallbackReturn: listener 호출 패턴
        this.listeners.forEach((listener) => listener(this.state));
    }
}

// 전역 앱 상태 타입 (다크모드, 커스텀모드, 세대 정보 등)
export interface AppState {
    isDarkMode: boolean;
    isCustomMode: boolean;
    generation: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | "champions";
    activeTab: string;
    tabs: TabItem[];
    visitCount: number;
    pwaGuideDismissed: boolean;
}

// 전역 스토어 인스턴스
export const globalStore = new Store<AppState>({
    isDarkMode: false,
    isCustomMode: false,
    generation: 9,
    activeTab: "settings",
    tabs: [...DEFAULT_TABS],
    visitCount: 0,
    pwaGuideDismissed: false,
});
