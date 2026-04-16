import { renderStatCalculator } from '../stat-calculator/index.js';
import { renderDamageCalculator } from '../damage-calculator/index.js';
import { renderTypeCalculator } from '../type-calculator/index.js';
import { renderCatchCalculator } from '../catch-calculator/index.js';

type CalculatorSubTab = 'stat' | 'damage' | 'type' | 'catch';

export async function renderCalculatorHub(container: HTMLElement): Promise<() => void> {
    let currentCleanup: (() => void) | null = null;
    let activeSubTab: CalculatorSubTab = (sessionStorage.getItem('calculator_active_subtab') as CalculatorSubTab) || 'stat';

    container.innerHTML = `
        <div class="calculator-hub">
            <div class="sub-tab-menu" style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch;">
                <button data-subtab="stat" class="sub-tab-btn">실수값</button>
                <button data-subtab="damage" class="sub-tab-btn">데미지</button>
                <button data-subtab="type" class="sub-tab-btn">타입 상성</button>
                <button data-subtab="catch" class="sub-tab-btn">포획</button>
            </div>
            <div id="calculator-content"></div>
        </div>
        <style>
            .calculator-hub .sub-tab-btn {
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: var(--bg-color, #fff);
                color: var(--text-color, #333);
                border-radius: 20px;
                cursor: pointer;
                white-space: nowrap;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            .calculator-hub .sub-tab-btn.active {
                background: var(--primary-color, #1976d2);
                color: #fff;
                border-color: var(--primary-color, #1976d2);
                font-weight: bold;
            }
            .calculator-hub .sub-tab-menu::-webkit-scrollbar {
                height: 4px;
            }
            .calculator-hub .sub-tab-menu::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 2px;
            }
        </style>
    `;

    const contentEl = container.querySelector('#calculator-content') as HTMLElement;
    const buttons = container.querySelectorAll<HTMLButtonElement>('.sub-tab-btn');

    const switchSubTab = async (tab: CalculatorSubTab) => {
        if (currentCleanup) currentCleanup();
        activeSubTab = tab;
        sessionStorage.setItem('calculator_active_subtab', tab);

        // UI 업데이트
        buttons.forEach(btn => {
            if (btn.dataset.subtab === tab) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        contentEl.innerHTML = '';
        
        switch (tab) {
            case 'stat':
                currentCleanup = await renderStatCalculator(contentEl);
                break;
            case 'damage':
                currentCleanup = await renderDamageCalculator(contentEl);
                break;
            case 'type':
                const cleanup = renderTypeCalculator(contentEl);
                currentCleanup = typeof cleanup === 'function' ? cleanup : () => {};
                break;
            case 'catch':
                currentCleanup = await renderCatchCalculator(contentEl);
                break;
        }
    };

    buttons.forEach(btn => {
        btn.onclick = () => switchSubTab(btn.dataset.subtab as CalculatorSubTab);
    });

    // 초기 탭 로드
    await switchSubTab(activeSubTab);

    return () => {
        if (currentCleanup) currentCleanup();
    };
}
