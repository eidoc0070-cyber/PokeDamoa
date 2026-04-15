import { globalStore } from '../state/store.js';
import { saveSettings } from '../state/storage.js';
import { getBrowserInfo, getInstallInstructions, shareToOpenExternal } from '../utils/pwa.js';
import type { BrowserType } from '../utils/pwa.js';

export function initPwaBanner(container: HTMLElement) {
    const { type, name, isMobile, isPWA, isIOS, isInApp } = getBrowserInfo();
    const state = globalStore.getState();

    // 팝업 표시 조건 체크:
    // 1. iOS인데 Safari가 아니거나, 2. 인앱 브라우저(카톡, 인스타 등)이거나, 3. 일반 방문 2회 이상 시
    const isSpecialCase = (isIOS && type !== 'Safari') || isInApp;
    const shouldShow = (isSpecialCase || state.visitCount >= 2) && isMobile && !isPWA && !state.pwaGuideDismissed;

    if (!shouldShow) return;

    renderBanner(container, type, name);
}

export function forceShowPwaBanner() {
    renderPwaModal();
}

function renderBanner(container: HTMLElement, detectedType: BrowserType, detectedName: string) {
    const { isIOS, isInApp, type } = getBrowserInfo();
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
        background: var(--primary-color, #ffcb05);
        color: #333;
        padding: 12px 15px;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 0.95rem;
        box-sizing: border-box;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(-100%);
        border-bottom: 2px solid rgba(0,0,0,0.1);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    `;

    const text = document.createElement('div');
    if (isIOS && type !== 'Safari') {
        text.innerHTML = `<strong>아이폰</strong>은 <strong>Safari</strong>에서만 앱 설치가 가능합니다. <br><small>Safari로 이동하여 설치하시겠습니까?</small>`;
    } else if (isInApp) {
        text.innerHTML = `<strong>인앱 브라우저</strong>에서는 설치가 불가능합니다. <br><small>외부 브라우저로 이동하여 설치해 보세요.</small>`;
    } else {
        text.innerHTML = `<strong>${detectedName}</strong>으로 설치하는 방법을 알려드릴까요?`;
    }
    
    const timerDisplay = document.createElement('div');
    timerDisplay.style.fontSize = '0.75rem';
    timerDisplay.style.opacity = '0.6';
    timerDisplay.style.marginTop = '4px';

    const statusMessage = document.createElement('div');
    statusMessage.style.cssText = `
        font-size: 0.8rem;
        font-weight: bold;
        display: none;
        margin-top: 5px;
    `;

    const buttons = document.createElement('div');
    buttons.style.cssText = `
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    `;

    // 1. 외부 브라우저 이동 버튼
    const targetBrowserName = isIOS ? 'Safari' : '외부 브라우저';
    const btnGoExternal = createButton(`${targetBrowserName}로 이동`, '#333', '#fff');
    
    // 2. 설치 방법 보기 버튼
    const btnShowGuide = createButton('설치 방법 보기', 'rgba(255,255,255,0.6)', '#333', true);
    
    // 3. 닫기 버튼 (X)
    const btnClose = document.createElement('button');
    btnClose.innerHTML = '&times;';
    btnClose.style.cssText = `
        background: none;
        border: none;
        color: #333;
        font-size: 1.6rem;
        cursor: pointer;
        padding: 0 5px;
        line-height: 0.8;
    `;

    text.appendChild(timerDisplay);
    text.appendChild(statusMessage);
    content.appendChild(text);
    content.appendChild(btnClose);
    
    buttons.appendChild(btnShowGuide);
    buttons.appendChild(btnGoExternal);
    
    banner.appendChild(content);
    banner.appendChild(buttons);
    container.appendChild(banner);

    // 슬라이드 다운 효과
    setTimeout(() => {
        banner.style.transform = 'translateY(0)';
    }, 100);

    let timeLeft = 20; // 안내 배너는 조금 더 길게 유지
    const updateTimer = () => {
        timerDisplay.textContent = `${timeLeft}초 후 자동 닫힘`;
    };
    updateTimer();

    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            closeBanner(false); 
        } else {
            updateTimer();
        }
    }, 1000);

    const closeBanner = (permanently = true) => {
        clearInterval(timerInterval);
        banner.style.transform = 'translateY(-100%)';
        setTimeout(() => {
            banner.remove();
        }, 400);

        if (permanently) {
            const state = globalStore.getState();
            globalStore.setState({ pwaGuideDismissed: true });
            saveSettings({ ...state, pwaGuideDismissed: true });
        }
    };

    btnClose.onclick = () => closeBanner(true);

    // 외부 브라우저 이동 로직
    btnGoExternal.onclick = async () => {
        const result = await shareToOpenExternal();
        statusMessage.style.display = 'block';
        
        if (result === 'shared') {
            statusMessage.textContent = `↗ 공유창에서 ${targetBrowserName}를 선택하세요!`;
            statusMessage.style.color = '#0056b3';
        } else if (result === 'copied') {
            statusMessage.textContent = '✓ 주소 복사 완료! 브라우저에 붙여넣어 주세요.';
            statusMessage.style.color = '#1e7e34';
            setTimeout(() => closeBanner(true), 3000);
        } else if (result === 'cancelled') {
            statusMessage.style.display = 'none';
        }
    };

    // 가이드 모달 띄우기
    btnShowGuide.onclick = () => {
        closeBanner(true);
        renderPwaModal(isIOS ? 'Safari' : detectedType);
    };
}

function createButton(text: string, bg: string, color: string, isOutline = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
        padding: 8px 16px;
        border-radius: 8px;
        border: ${isOutline ? '1px solid rgba(0,0,0,0.2)' : 'none'};
        background: ${bg};
        color: ${color};
        font-weight: bold;
        cursor: pointer;
        font-size: 0.85rem;
        box-shadow: ${isOutline ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'};
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
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(5px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--bg-color, #fff);
        color: var(--text-color, #333);
        width: 90%;
        max-width: 480px;
        max-height: 85vh;
        border-radius: 20px;
        padding: 25px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.4);
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
        const { type: detectedType, isIOS, isInApp } = getBrowserInfo();
        const browserList: { type: BrowserType, name: string }[] = [
            { type: 'Chrome', name: 'Chrome' },
            { type: 'Safari', name: 'Safari' },
            { type: 'Samsung', name: '삼성 인터넷' },
            { type: 'Whale', name: '네이버 웨일' },
            { type: 'Firefox', name: 'Firefox' }
        ];

        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.4rem; letter-spacing:-0.5px;">PWA 설치 안내</h2>
                <button id="pwa-modal-close" style="background:none; border:none; font-size:2rem; cursor:pointer; color:inherit; line-height:0.5;">&times;</button>
            </div>
            <p style="margin:0; font-size:0.95rem; color:#666; line-height:1.5;">
                ${isInApp ? '카카오톡/인스타그램 같은 <strong>인앱 브라우저</strong>에서는 설치가 불가능합니다.' : (isIOS ? '아이폰은 <strong>Safari</strong>를 이용해야 앱 설치가 가능합니다.' : '브라우저를 선택하여 설치 방법을 확인하세요.')}
            </p>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:5px;">
                ${browserList.map(b => {
                    const isRecommended = (isIOS && b.type === 'Safari') || (!isIOS && b.type === 'Chrome');
                    return `
                    <button class="browser-btn" data-type="${b.type}" data-name="${b.name}" style="
                        padding: 18px;
                        border-radius: 14px;
                        border: 1px solid #eee;
                        background: ${isRecommended ? 'rgba(255, 203, 5, 0.15)' : 'rgba(0,0,0,0.02)'};
                        color: inherit;
                        font-weight: bold;
                        font-size: 1.05rem;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.2s;
                    ">
                        <span>${b.name} ${isRecommended ? '<small style="color:#d32f2f; margin-left:5px;">(권장)</small>' : ''}</span>
                        <span style="font-size:0.9rem; opacity:0.3;">▶</span>
                    </button>
                    `;
                }).join('')}
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
        const { isIOS, type: detectedType, isInApp } = getBrowserInfo();
        const instructions = getInstallInstructions(type);
        
        const needsExternal = (isIOS && detectedType !== 'Safari') || isInApp;
        const targetBrowserName = isIOS ? 'Safari' : 'Chrome/외부 브라우저';

        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 style="margin:0; font-size:1.3rem;">${name} 설치 방법</h2>
                <button id="pwa-modal-close" style="background:none; border:none; font-size:2rem; cursor:pointer; color:inherit; line-height:0.5;">&times;</button>
            </div>
            <div style="flex:1; margin-top:10px;">
                <ul style="padding-left:20px; line-height:1.7; font-size:0.95rem;">
                    ${instructions.map(i => `<li style="margin-bottom:8px;">${i}</li>`).join('')}
                </ul>
                ${needsExternal ? `
                    <div style="margin-top:25px; background:#f9f9f9; padding:20px; border-radius:15px; border:1px solid #eee;">
                        <p style="margin:0 0 12px 0; font-size:0.9rem; font-weight:bold; color:#d32f2f;">잠깐! 외부 브라우저를 이용해 주세요.</p>
                        <p style="margin:0 0 15px 0; font-size:0.85rem; color:#666; line-height:1.4;">
                            현재 브라우저에서는 앱 설치가 제한적일 수 있습니다. <br>
                            아래 버튼을 눌러 <strong>${targetBrowserName}</strong>(으)로 이동하면 원활하게 설치할 수 있습니다.<br>
                            <small style="color:#999; display:block; margin-top:5px;">* 누구에게도 전송되지 않으니 안심하세요!</small>
                        </p>
                        <button id="pwa-share-btn" style="width:100%; padding:14px; border-radius:10px; border:none; background:#333; color:#fff; font-weight:bold; cursor:pointer; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <span>${targetBrowserName}로 이동하기</span>
                            <span style="font-size:1.1rem;">↗</span>
                        </button>
                        <p id="pwa-share-status" style="margin-top:8px; font-size:0.8rem; text-align:center; display:none;"></p>
                    </div>
                ` : `
                    <p style="font-size:0.85rem; color:#888; margin-top:20px; border-top:1px dashed #eee; padding-top:15px;">
                        * 설치 후에는 홈 화면에서 아이콘을 눌러 바로 접속할 수 있습니다.
                    </p>
                `}
            </div>
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button id="pwa-modal-back" style="flex:1; padding:12px; border-radius:10px; border:1px solid #ddd; background:#f5f5f5; color:#333; font-weight:bold; cursor:pointer;">목록으로</button>
                <button id="pwa-modal-close-btn" style="flex:1; padding:12px; border-radius:10px; border:none; background:var(--primary-color, #ffcb05); color:#333; font-weight:bold; cursor:pointer;">확인</button>
            </div>
        `;

        modal.querySelector('#pwa-modal-close')?.addEventListener('click', closePwaModal);
        modal.querySelector('#pwa-modal-close-btn')?.addEventListener('click', closePwaModal);
        modal.querySelector('#pwa-modal-back')?.addEventListener('click', renderBrowserList);

        const shareBtn = modal.querySelector('#pwa-share-btn');
        const statusText = modal.querySelector('#pwa-share-status') as HTMLElement;

        shareBtn?.addEventListener('click', async () => {
            const result = await shareToOpenExternal();
            
            if (statusText) statusText.style.display = 'block';

            if (result === 'shared') {
                statusText.textContent = `공유창에서 ${targetBrowserName}를 선택해 주세요.`;
                statusText.style.color = '#2196f3';
            } else if (result === 'copied') {
                statusText.textContent = '주소가 복사되었습니다! 외부 브라우저를 열고 붙여넣어 주세요.';
                statusText.style.color = '#4caf50';
            } else if (result === 'cancelled') {
                statusText.textContent = '공유가 취소되었습니다.';
                statusText.style.color = '#f44336';
            } else {
                statusText.textContent = '이동에 실패했습니다. 직접 주소를 복사해 주세요.';
                statusText.style.color = '#f44336';
            }
        });
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

    const escListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closePwaModal();
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
}
