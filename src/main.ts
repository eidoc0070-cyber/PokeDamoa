// TEMP DEBUG: 오프라인 하얀 화면 버그 진단용, 원인 파악 후 제거 예정
(function setupMainErrorHandling() {
    const renderErrorBox = (type: string, msg: string, source?: string, lineno?: number, colno?: number, err?: any) => {
        let container = document.getElementById("debug-error-box");
        if (!container) {
            container = document.createElement("div");
            container.id = "debug-error-box";
            container.style.cssText =
                "position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(180,0,0,0.95);color:#fff;padding:20px;font-family:monospace;font-size:14px;overflow:auto;white-space:pre-wrap;word-break:break-all;";
            const closeBtn = document.createElement("button");
            closeBtn.innerText = "[닫기]";
            closeBtn.style.cssText =
                "float:right;background:#fff;color:#900;border:none;padding:8px 16px;font-weight:bold;cursor:pointer;margin-bottom:12px;border-radius:4px;";
            closeBtn.onclick = () => container?.remove();
            container.appendChild(closeBtn);
            const title = document.createElement("h3");
            title.innerText = "⚠️ [TEMP DEBUG main.ts] 감지된 에러";
            title.style.cssText = "margin:0 0 10px 0;color:#ffcccc;";
            container.appendChild(title);
            const content = document.createElement("div");
            content.id = "debug-error-content";
            container.appendChild(content);
            if (document.body) {
                document.body.appendChild(container);
            } else {
                document.addEventListener("DOMContentLoaded", () => {
                    if (container && document.body) {
                        document.body.appendChild(container);
                    }
                });
            }
        }
        const content = document.getElementById("debug-error-content");
        if (content) {
            const errDetail = err && err.stack ? err.stack : err || "";
            const item = document.createElement("div");
            item.style.cssText = "margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.3);";
            item.innerHTML = `<strong>[${type}]</strong> ${msg || ""}<br>` +
                `<small>Source: ${source || "N/A"}:${lineno || 0}:${colno || 0}</small><br>` +
                `<pre style="margin-top:6px;background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;">${errDetail}</pre>`;
            content.appendChild(item);
        }
    };

    window.addEventListener("error", (e) => {
        renderErrorBox("MAIN_TS ERROR", e.message, e.filename, e.lineno, e.colno, e.error);
    });

    window.addEventListener("unhandledrejection", (e) => {
        const reason = e.reason;
        const msg = reason && reason.message ? reason.message : String(reason);
        renderErrorBox("MAIN_TS UNHANDLED REJECTION", msg, reason && reason.fileName, reason && reason.lineNumber, 0, reason);
    });
})();

import "./style.css";
import { initApp } from "./app.js";
import { getLoadedData } from "./data/pokeapi.js";
import { globalStore } from "./state/store.js";
import * as Hangul from "./utils/hangul.js";
import * as PokemonMath from "./utils/pokemon-math.js";

// 개발 및 디버깅 편의를 위해 전역 객체 노출
window.PokeApp = {
    store: globalStore,
    math: PokemonMath,
    hangul: Hangul,
    data: getLoadedData,
};

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (rootElement) {
    initApp(rootElement);
} else {
    console.error("Root element #app not found!");
}

// PWA 설치 프로모션 지원을 위한 beforeinstallprompt 이벤트 처리
window.addEventListener("beforeinstallprompt", (e) => {
    // 브라우저의 기본 설치 배너/다이얼로그 노출 방지
    e.preventDefault();
    // 이벤트를 저장해 두었다가 나중에 트리거할 때 사용
    window.deferredPrompt = e;

    // 상태 변경 알림 이벤트 발생 (UI 컴포넌트가 감지할 수 있도록)
    window.dispatchEvent(new CustomEvent("pwa-installable"));
    console.log("PWA 설치 준비 완료 (beforeinstallprompt 이벤트 감지됨)");
});

window.addEventListener("appinstalled", () => {
    // 설치가 완료되면 저장해둔 프로프트 초기화
    window.deferredPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
    console.log("PWA가 성공적으로 설치되었습니다.");
});

// 서비스 워커 등록 (PWA 및 오프라인 지원)
if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register("/sw.js");
            console.log("Service Worker 등록 성공:", registration.scope);

            // 업데이트 확인 로직
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        // 새로운 버전이 설치됨 (기존에 컨트롤러가 있었던 경우에만 알림)
                        if (confirm("새로운 버전이 준비되었습니다. 지금 업데이트하시겠습니까?")) {
                            newWorker.postMessage({ type: "SKIP_WAITING" });
                            window.location.reload();
                        }
                    }
                });
            });
        } catch (err) {
            console.error("Service Worker 등록 실패:", err);
        }
    });

    // 컨트롤러 변경 감지 (새 서비스 워커가 제어권을 가졌을 때 새로고침)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}
