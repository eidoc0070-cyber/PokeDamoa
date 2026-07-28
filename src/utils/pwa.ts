/**
 * PWA 설치 및 브라우저 감지 관련 유틸리티
 */

export type BrowserType = "Chrome" | "Safari" | "Samsung" | "Whale" | "Firefox" | "Kakao" | "Instagram" | "Other";

export interface BrowserInfo {
    type: BrowserType;
    name: string;
    isMobile: boolean;
    isPWA: boolean;
    isIOS: boolean;
    isInApp: boolean;
}

export function getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;
    const isPWA = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

    let type: BrowserType = "Other";
    let name = "기타 브라우저";
    let isInApp = false;

    // 인앱 브라우저 패턴
    const inAppPatterns = [
        /KAKAOTALK/i,
        /Instagram/i,
        /FBAN|FBAV|FB_IAB/i, // Facebook
        /Twitter/i,
        /Line\//i,
        /NAVER/i,
        /TikTok/i,
    ];
    isInApp = inAppPatterns.some((p) => p.test(ua));

    if (ua.includes("KAKAOTALK")) {
        type = "Kakao";
        name = "카카오톡 인앱";
    } else if (ua.includes("Instagram")) {
        type = "Instagram";
        name = "인스타그램 인앱";
    } else if (ua.includes("SamsungBrowser")) {
        type = "Samsung";
        name = "삼성 인터넷";
    } else if (ua.includes("Whale")) {
        type = "Whale";
        name = "네이버 웨일";
    } else if (ua.includes("Firefox") || ua.includes("FxiOS")) {
        type = "Firefox";
        name = "Firefox";
    } else if (ua.includes("Chrome") || ua.includes("CriOS")) {
        type = "Chrome";
        name = "Chrome";
    } else if (ua.includes("Safari")) {
        // iOS에서 Chrome(CriOS), Firefox(FxiOS) 등이 Safari 문자열을 포함할 수 있으므로 제외
        if (isIOS && (ua.includes("CriOS") || ua.includes("FxiOS") || ua.includes("EdgiOS") || ua.includes("OPiOS"))) {
            if (ua.includes("CriOS")) {
                type = "Chrome";
                name = "Chrome";
            } else if (ua.includes("FxiOS")) {
                type = "Firefox";
                name = "Firefox";
            } else {
                type = "Other";
                name = "기타 브라우저";
            }
        } else {
            type = "Safari";
            name = "Safari";
        }
    }

    return { type, name, isMobile, isPWA, isIOS, isInApp };
}

export function getInstallInstructions(type: BrowserType): string[] {
    switch (type) {
        case "Chrome":
            return [
                "1. 주소창 오른쪽의 설치 아이콘(⊕)을 클릭하세요.",
                '2. 아이콘이 없다면 메뉴(⋮)에서 "홈 화면에 추가"를 선택하세요.',
            ];
        case "Safari":
            return [
                '1. 하단 도구 막대에서 "공유" 버튼(사각형에 위 화살표)을 클릭하세요.',
                '2. 메뉴를 아래로 스크롤하여 "홈 화면에 추가"를 선택하세요.',
            ];
        case "Samsung":
            return ["1. 하단 메뉴(≡)를 클릭하세요.", '2. "+ 페이지 추가"를 선택한 후 "홈 화면"을 클릭하세요.'];
        case "Whale":
            return ["1. 하단 메뉴(≡)를 클릭하세요.", '2. "홈 화면에 추가" 아이콘을 클릭하세요.'];
        case "Firefox":
            return [
                "1. 주소창 오른쪽의 집 모양 아이콘 또는 메뉴(⋮)를 클릭하세요.",
                '2. "홈 화면에 추가"를 선택하세요.',
            ];
        case "Kakao":
        case "Instagram":
            return [
                "인앱 브라우저에서는 직접 설치가 불가능합니다.",
                '오른쪽 위 메뉴를 눌러 "다른 브라우저로 열기" 또는 "Safari로 열기"를 선택한 후 설치해 주세요.',
            ];
        default:
            return [
                "1. 브라우저 설정 또는 공유 메뉴를 확인하세요.",
                '2. "홈 화면에 추가" 또는 "앱 설치" 항목을 선택하세요.',
            ];
    }
}

/**
 * 텍스트를 클립보드에 복사합니다.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            return successful;
        }
    } catch (err) {
        console.error("클립보드 복사 실패:", err);
        return false;
    }
}

/**
 * Web Share API를 사용하여 공유 시트를 엽니다.
 * 실패 시 클립보드 복사로 폴백합니다.
 */
export async function shareToOpenExternal(): Promise<"shared" | "copied" | "cancelled" | "failed"> {
    const url = window.location.href;
    const title = document.title || "포케다모아";

    if (navigator.share) {
        try {
            await navigator.share({
                title,
                url,
            });
            return "shared";
        } catch (err: any) {
            if (err.name === "AbortError") {
                return "cancelled";
            }
            console.warn("Web Share API 실패, 클립보드 복사로 전환:", err);
        }
    }

    const copied = await copyToClipboard(url);
    return copied ? "copied" : "failed";
}
