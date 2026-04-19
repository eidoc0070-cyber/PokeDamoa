# PokeDamoa (포케다모아) - AI Agent Context & Guidelines

> ⚠️ **ATTENTION AI AGENTS**: 이 문서는 사람보다는 **이 프로젝트를 유지보수하고 기능을 추가할 AI(LLM) 요원을 위해 작성된 핵심 가이드라인**입니다. 코드를 수정하거나 기능을 제안하기 전에 반드시 아래의 규칙과 아키텍처를 숙지하십시오.

---

## 🛑 STRICT RULES (절대 규칙)

1. **PACKAGE MANAGER**: 절대 `npm`, `yarn`, `pnpm`을 사용하지 마십시오. 오직 **`bun`** 명령어만을 허용합니다.
   - `bun add <pkg>`, `bun run dev`, `bun test`
2. **ENVIRONMENT**: 현재 `devDependencies` 및 `bunfig.toml` 세팅은 최적화되어 있습니다. 사용자의 명시적 지시가 없는 한 버전을 내리거나 함부로 라이브러리를 추가하지 마십시오.
3. **MOBILE FIRST**: 이 프로젝트는 데스크탑 호환성을 과감히 버리고 **100% 모바일 퍼스트(Mobile First)** 로 설계된 SPA(Single Page Application) 웹앱입니다.
   - 화면이 좁은 모바일(너비 375px 내외) 환경을 기준으로 UI 컴포넌트를 설계해야 합니다.
   - 빽빽한 `<table>` 보다는 세로 스크롤 위주의 `Card`, `Accordion` 디자인을 우선 사용하십시오.

---

## 🏛 ARCHITECTURE & UI/UX

- **Routing**: `src/app.ts`와 `src/state/url-params.ts`가 관리합니다.
  - 메인 메뉴는 **Bottom Navigation (하단 고정 탭 바)** 방식입니다. (`index.html` 및 `app.ts` 참조)
  - 탭 내부의 서브 기능(예: 도감 내 포켓몬/기술/특성)은 화면 상단의 스와이프 가능한 **Top Tab Bar (서브 탭)** 방식을 사용합니다.
- **State Management**: `src/state/store.ts`를 통한 전역 상태 관리(Zustand 스타일의 단방향 데이터 흐름)를 사용합니다. 데이터 영속성은 `localStorage`와 `sessionStorage`를 활용합니다.
- **Styling**: `style.css`에서 Vanilla CSS로 관리되며, Glassmorphism(투명도와 블러) 효과와 부드러운 애니메이션(`transition`)을 지향합니다. 인라인 스타일을 사용할 때는 가독성과 터치 조작성(`padding`, `gap` 최소 8px 이상)을 확보하십시오.

---

## 📂 DIRECTORY STRUCTURE

*   `src/components/`: 여러 화면에서 공통으로 쓰이는 UI 모듈 (예: `StatInputCard.ts`, `Accordion.ts`, `SearchAutocomplete.ts`). 컴포넌트를 만들 때는 여기에 추가하여 중복 코드를 방지하십시오.
*   `src/features/`: Bottom Nav 또는 Top Tab에 의해 라우팅되는 각각의 도메인 로직 (예: `calculator`, `pokedex`, `settings`). 
*   `src/data/`: 포켓몬 종족값, 상성, 로케일 등 정적 상수와 PokeAPI 통신 레이어.
*   `src/state/`: 앱의 전역 상태(`globalStore`) 및 URL 파라미터 파싱 로직.
*   `src/utils/`: 데미지 계산, 스탯 계산, 한글 초성 검색 등 순수 함수(Pure Functions) 모음.
*   `tests/`: 모든 테스트 코드.

---

## 🧪 TESTING INSTRUCTIONS

이 프로젝트는 `jsdom` 대신 **`happy-dom`**을 사용하며, **`bun test`** 러너를 사용합니다.

- `tests/setup.ts`에서 글로벌 DOM 환경과 모바일 디바이스 해상도(`innerWidth: 390`)를 Mocking하고 있습니다.
- 새로운 UI 컴포넌트나 계산 로직을 작성했다면, 반드시 `*.test.ts` 파일을 갱신하거나 추가하여 무결성을 증명하십시오.
- UI 렌더링 검증 시 클래스명(`.bottom-nav`, `.top-tab-btn`)이나 상태(`.active`)를 기준으로 쿼리 셀렉터를 작성하십시오.
- 실행 명령어: `bun test`

---

> **Agent Prompt:** "당신은 위의 가이드라인을 완벽히 이해했습니다. 기존의 모듈식 구조를 존중하고, 코드 중복을 최소화하며, 언제나 모바일 화면에서의 터치 UX를 최우선으로 고려하여 답변과 코드를 생성하십시오."
