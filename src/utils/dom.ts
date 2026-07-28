/**
 * DOM 조작을 돕는 유틸리티 함수들
 */

export interface CreateElementOptions {
    className?: string;
    id?: string;
    style?: Partial<CSSStyleDeclaration>;
    text?: string;
    html?: string;
    attributes?: Record<string, string>;
}

/**
 * 요소를 생성하고 속성을 부여합니다.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options: CreateElementOptions = {},
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);
    if (options.className) el.className = options.className;
    if (options.id) el.id = options.id;
    if (options.text) el.textContent = options.text;
    if (options.html) el.innerHTML = options.html;

    if (options.style) {
        Object.assign(el.style, options.style);
    }

    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            el.setAttribute(key, value);
        }
    }

    return el;
}

/**
 * 특정 요소의 모든 자식 요소를 제거합니다.
 */
export function clearChildren(element: HTMLElement) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
