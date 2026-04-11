import { globalStore } from '../state/store.js';
import { saveSettings } from '../state/storage.js';
import { getBrowserInfo, getInstallInstructions } from '../utils/pwa.js';
import type { BrowserType } from '../utils/pwa.js';

export function initPwaBanner(container: HTMLElement) {
    const { type, name, isMobile, isPWA } = getBrowserInfo();
    const state = globalStore.getState();

    // 팝업 표시 조건 체크
    // 1. 모바일 브라우저여야 함
    // 2. 이미 PWA로 접속 중이 아니어야 함
    // 3. 이미 닫은 기록이 없어야 함
    // 4. 2번째 또는 3번째 방문일 때 (또는 그 이상, 사용자 요청에 따라 2~3번째 강조)
    const shouldShow = isMobile && !isPWA && !state.pwaGuideDismissed && state.visitCount >= 2;

    if (!shouldShow) return;

    renderBanner(container, type, name);
}

export function forceShowPwaBanner(container: HTMLElement) {
    const { type, name } = getBrowserInfo();
    renderBanner(container, type, name);
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
        color: white;
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

    const btnYes = createButton('네, 알려주세요', '#fff', 'var(--primary-color)');
    const btnOthers = createButton('다른 브라우저 방법 보기', 'rgba(255,255,255,0.2)', '#fff', true);
    const btnClose = document.createElement('button');
    btnClose.innerHTML = '&times;';
    btnClose.style.cssText = `
        background: none;
        border: none;
        color: white;
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
        clearInterval(timerInterval);
        timerDisplay.remove();
        showInstructions(banner, detectedType, detectedName);
    };

    btnOthers.onclick = () => {
        clearInterval(timerInterval);
        timerDisplay.remove();
        showBrowserList(banner);
    };
}

function createButton(text: string, bg: string, color: string, isOutline = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
        padding: 6px 12px;
        border-radius: 4px;
        border: ${isOutline ? '1px solid white' : 'none'};
        background: ${bg};
        color: ${color};
        font-weight: bold;
        cursor: pointer;
        font-size: 0.85rem;
    `;
    return btn;
}

function showInstructions(banner: HTMLElement, type: BrowserType, name: string) {
    const instructions = getInstallInstructions(type);
    
    banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <strong style="display:block; margin-bottom:5px;">${name} 설치 방법</strong>
                <ul style="margin:0; padding-left:20px; font-size:0.85rem; line-height:1.4;">
                    ${instructions.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
            <button id="pwa-banner-close-final" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>
        </div>
        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
            <button id="pwa-banner-back" style="background:rgba(255,255,255,0.2); border:1px solid white; color:white; padding:4px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;">뒤로가기</button>
        </div>
    `;

    banner.querySelector('#pwa-banner-close-final')?.addEventListener('click', () => {
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => banner.remove(), 300);
        
        const state = globalStore.getState();
        globalStore.setState({ pwaGuideDismissed: true });
        saveSettings({ ...state, pwaGuideDismissed: true });
    });

    banner.querySelector('#pwa-banner-back')?.addEventListener('click', () => {
        const { type, name } = getBrowserInfo();
        renderBanner(document.body, type, name);
    });
}

function showBrowserList(banner: HTMLElement) {
    const browsers: { type: BrowserType, name: string }[] = [
        { type: 'Chrome', name: 'Chrome' },
        { type: 'Safari', name: 'Safari' },
        { type: 'Samsung', name: '삼성 인터넷' },
        { type: 'Whale', name: '네이버 웨일' },
        { type: 'Firefox', name: 'Firefox' }
    ];

    banner.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>방법을 확인할 브라우저를 선택하세요</strong>
            <button id="pwa-banner-close-list" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer; line-height:1;">&times;</button>
        </div>
        <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:5px;">
            ${browsers.map(b => `<button class="browser-select-btn" data-type="${b.type}" data-name="${b.name}" style="background:white; color:var(--primary-color, #2196f3); border:none; padding:5px 10px; border-radius:4px; font-size:0.8rem; font-weight:bold; cursor:pointer;">${b.name}</button>`).join('')}
        </div>
        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
            <button id="pwa-banner-back-list" style="background:rgba(255,255,255,0.2); border:1px solid white; color:white; padding:4px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;">뒤로가기</button>
        </div>
    `;

    banner.querySelectorAll('.browser-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = (btn as HTMLElement).dataset.type as BrowserType;
            const name = (btn as HTMLElement).dataset.name as string;
            showInstructions(banner, type, name);
        });
    });

    banner.querySelector('#pwa-banner-close-list')?.addEventListener('click', () => {
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => banner.remove(), 300);
        
        const state = globalStore.getState();
        globalStore.setState({ pwaGuideDismissed: true });
        saveSettings({ ...state, pwaGuideDismissed: true });
    });

    banner.querySelector('#pwa-banner-back-list')?.addEventListener('click', () => {
        const { type, name } = getBrowserInfo();
        renderBanner(document.body, type, name);
    });
}
