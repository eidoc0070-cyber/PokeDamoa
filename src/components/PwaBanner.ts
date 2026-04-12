import { globalStore } from '../state/store.js';
import { saveSettings } from '../state/storage.js';
import { getBrowserInfo, getInstallInstructions } from '../utils/pwa.js';
import type { BrowserType } from '../utils/pwa.js';

export function initPwaBanner(container: HTMLElement) {
    const { type, name, isMobile, isPWA } = getBrowserInfo();
    const state = globalStore.getState();

    // 팝업 표시 조건 체크
    const shouldShow = isMobile && !isPWA && !state.pwaGuideDismissed && state.visitCount >= 2;

    if (!shouldShow) return;

    renderBanner(container, type, name);
}

export function forceShowPwaBanner() {
    renderPwaModal();
}

function renderBanner(container: HTMLElement, detectedType: BrowserType, detectedName: string) {
    // 이미 존재하는 배너 제거
    const existing = document.getElementById('pwa-install-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: var(--primary-color, #2196f3);
        color: #333;
        padding: 10px 15px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 0.9rem;
        box-sizing: border-box;
        transition: transform 0.3s ease-in-out;
        transform: translateY(-100%);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const text = document.createElement('div');
    text.innerHTML = `<strong>${detectedName}</strong>으로 설치하는 방법을 알려드릴까요?`;
    
    const timerDisplay = document.createElement('span');
    timerDisplay.style.marginLeft = '10px';
    timerDisplay.style.fontSize = '0.8rem';
    timerDisplay.style.opacity = '0.8';

    const buttons = document.createElement('div');
    buttons.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    `;

    const btnYes = createButton('네, 알려주세요', '#fff', '#333');
    const btnOthers = createButton('다른 브라우저 방법 보기', 'rgba(0,0,0,0.05)', '#333', true);
    const btnClose = document.createElement('button');
    btnClose.innerHTML = '&times;';
    btnClose.style.cssText = `
        background: none;
        border: none;
        color: #333;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0 5px;
        line-height: 1;
    `;

    text.appendChild(timerDisplay);
    content.appendChild(text);
    content.appendChild(btnClose);
    
    buttons.appendChild(btnOthers);
    buttons.appendChild(btnYes);
    
    banner.appendChild(content);
    banner.appendChild(buttons);
    container.appendChild(banner);

    // 슬라이드 다운 효과
    setTimeout(() => {
        banner.style.transform = 'translateY(0)';
    }, 100);

    let timeLeft = 15; // 15초 타이머
    const updateTimer = () => {
        timerDisplay.textContent = `(${timeLeft}초 후 닫힘)`;
    };
    updateTimer();

    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            closeBanner();
        } else {
            updateTimer();
        }
    }, 1000);

    const closeBanner = (permanently = true) => {
        clearInterval(timerInterval);
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => {
            banner.remove();
        }, 300);

        if (permanently) {
            const state = globalStore.getState();
            globalStore.setState({ pwaGuideDismissed: true });
            saveSettings({
                ...state,
                pwaGuideDismissed: true
            });
        }
    };

    btnClose.onclick = () => closeBanner(true);

    btnYes.onclick = () => {
        closeBanner(true);
        renderPwaModal(detectedType);
    };

    btnOthers.onclick = () => {
        closeBanner(true);
        renderPwaModal();
    };
}

function createButton(text: string, bg: string, color: string, isOutline = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
        padding: 6px 12px;
        border-radius: 4px;
        border: ${isOutline ? '1px solid #333' : 'none'};
        background: ${bg};
        color: ${color};
        font-weight: bold;
        cursor: pointer;
        font-size: 0.85rem;
    `;
    return btn;
}

export function renderPwaModal(initialType?: BrowserType) {
    const overlay = document.createElement('div');
    overlay.id = 'pwa-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--bg-color, #fff);
        color: var(--text-color, #333);
        width: 90%;
        max-width: 500px;
        max-height: 85vh;
        border-radius: 16px;
        padding: 25px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        position: relative;
        overflow-y: auto;
    `;

    const closePwaModal = () => {
        overlay.remove();
        const state = globalStore.getState();
        globalStore.setState({ pwaGuideDismissed: true });
        saveSettings({ ...state, pwaGuideDismissed: true });
    };

    const renderBrowserList = () => {
        const { type: detectedType } = getBrowserInfo();
        const browserList: { type: BrowserType, name: string }[] = [
            { type: 'Chrome', name: 'Chrome' },
            { type: 'Safari', name: 'Safari' },
            { type: 'Samsung', name: '삼성 인터넷' },
            { type: 'Whale', name: '네이버 웨일' },
            { type: 'Firefox', name: 'Firefox' }
        ];

        // 감지된 브라우저를 맨 위로 정렬
        browserList.sort((a, b) => {
            if (a.type === detectedType) return -1;
            if (b.type === detectedType) return 1;
            return 0;
        });

        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.3rem;">PWA 설치 방법 안내</h2>
                <button id="pwa-modal-close" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:inherit;">&times;</button>
            </div>
            <p style="margin:0; font-size:0.95rem; color:#666;">사용 중인 브라우저를 선택하여 설치 방법을 확인하세요.</p>
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:5px;">
                ${browserList.map(b => `
                    <button class="browser-btn" data-type="${b.type}" data-name="${b.name}" style="
                        padding: 15px;
                        border-radius: 12px;
                        border: 1px solid #ddd;
                        background: ${b.type === detectedType ? 'rgba(255, 203, 5, 0.1)' : 'transparent'};
                        color: inherit;
                        font-weight: bold;
                        font-size: 1.05rem;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        text-align: left;
                    ">
                        <span>${b.name} ${b.type === detectedType ? '<small style="color:#d32f2f; margin-left:5px;">(감지됨)</small>' : ''}</span>
                        <span style="font-size:0.8rem; opacity:0.5;">▶</span>
                    </button>
                `).join('')}
            </div>
        `;

        modal.querySelector('#pwa-modal-close')?.addEventListener('click', closePwaModal);
        modal.querySelectorAll('.browser-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = (e.currentTarget as HTMLElement).dataset.type as BrowserType;
                const name = (e.currentTarget as HTMLElement).dataset.name as string;
                renderInstructions(type, name);
            });
        });
    };

    const renderInstructions = (type: BrowserType, name: string) => {
        const instructions = getInstallInstructions(type);
        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.3rem;">${name} 설치 방법</h2>
                <button id="pwa-modal-close" style="background:none; border:none; font-size:1.8rem; cursor:pointer; color:inherit;">&times;</button>
            </div>
            <div style="flex:1; margin-top:10px;">
                <ul style="padding-left:20px; line-height:1.8; font-size:1rem;">
                    ${instructions.map(i => `<li style="margin-bottom:10px;">${i}</li>`).join('')}
                </ul>
                ${(type === 'Kakao' || type === 'Instagram') ? '' : `
                    <p style="font-size:0.85rem; color:#888; margin-top:20px; border-top:1px dashed #ccc; padding-top:15px;">
                        * 설치 후에는 홈 화면에서 아이콘을 눌러 바로 접속할 수 있습니다.
                    </p>
                `}
            </div>
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button id="pwa-modal-back" style="flex:1; padding:12px; border-radius:8px; border:1px solid #ddd; background:#f5f5f5; color:#333; font-weight:bold; cursor:pointer;">목록으로</button>
                <button id="pwa-modal-close-btn" style="flex:1; padding:12px; border-radius:8px; border:none; background:var(--primary-color, #ffcb05); color:#333; font-weight:bold; cursor:pointer;">닫기</button>
            </div>
        `;

        modal.querySelector('#pwa-modal-close')?.addEventListener('click', closePwaModal);
        modal.querySelector('#pwa-modal-close-btn')?.addEventListener('click', closePwaModal);
        modal.querySelector('#pwa-modal-back')?.addEventListener('click', renderBrowserList);
    };

    if (initialType) {
        const browserMap: Record<BrowserType, string> = {
            'Chrome': 'Chrome',
            'Safari': 'Safari',
            'Samsung': '삼성 인터넷',
            'Whale': '네이버 웨일',
            'Firefox': 'Firefox',
            'Kakao': '카카오톡',
            'Instagram': '인스타그램',
            'Other': '기타 브라우저'
        };
        renderInstructions(initialType, browserMap[initialType]);
    } else {
        renderBrowserList();
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // ESC 키로 닫기
    const escListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closePwaModal();
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
}
