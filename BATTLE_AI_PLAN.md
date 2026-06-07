# 완전 데이터 주도형 배틀 엔진 (Sandbag AI) 개발 계획

## 1. 철학 및 원칙 (Philosophy)
- **Engine as a Shell (껍데기 엔진)**: 엔진은 특정 기술이나 특성의 이름을 알아선 안 됩니다. 오직 주입된 '효과 태그(Effect Tags)'를 정해진 타이밍(Hooks)에 실행하는 역할만 수행합니다.
- **Everything is Custom (모든 것은 커스텀이다)**: 기본 제공되는 포켓몬 데이터(Base Pack)는 그 자체로 특별한 코드가 아니라, 커스텀 시스템으로 구현된 '프리셋'일 뿐입니다.
- **Data-Driven (데이터 주도)**: 새로운 기믹(테라스탈 등)을 추가할 때 엔진 코드를 수정하는 것이 아니라, 새로운 효과 스키마와 데이터를 정의하여 대응합니다.

## 2. 핵심 아키텍처: 효과 태그(Effect Tag) 시스템

### A. 효과 태그 스키마 (Effect Schema)
모든 배틀 로직은 아래와 같은 정형화된 데이터 구조로 표현됩니다.
```typescript
interface EffectTag {
  id: string;          // 효과 고유 식별자
  trigger: EventHook;  // 발동 타이밍 (예: onEntry, onBeforeMove, onDamageCalc)
  condition?: string;  // 발동 조건 (예: "HP < 50%", "MoveType == Fire") - 단순화된 DSL 또는 룰 엔진 활용
  action: EffectAction;// 수행할 동작
  params: any;         // 동작에 필요한 파라미터 (예: { stat: 'atk', stage: -1 })
  target: TargetType;  // 대상 (self, opponent, field 등)
  priority: number;    // 실행 우선순위
}
```

### B. 이벤트 훅 (Event Hooks)
엔진은 배틀 흐름에 따라 다음 훅들을 노출하고, 해당 훅에 등록된 모든 `EffectTag`를 실행합니다.
- `onEntry`: 포켓몬 등장 시 (예: 위협, 잔비)
- `onBeforeMove`: 기술 사용 직전 (예: 명중 체크, 풀죽음, 마비 체크)
- `onDamageCalc`: 데미지 계산 시 (예: 자속보정, 타입상성, 특성/도구 보정)
- `onAfterMove`: 기술 사용 직후 (예: 반동, 부가효과 랭크변화, 상태이상)
- `onTurnEnd`: 턴 종료 시 (예: 먹보, 상태이상 데미지, 필드 지속시간 감소)
- `onFaint`: 기절 시
- `onSwitchOut`: 교체되어 들어갈 때

## 3. 단계별 개발 로드맵

### Phase 1: 기반 설계 및 스키마 확정 (Core Design) - [완료]
- [x] **EffectTag 인터페이스 정의**: 모든 배틀 변수를 수용할 수 있는 유연한 스키마 설계.
- [x] **데이터 구조 리팩토링**: `pokeapi.ts` 및 관련 타입에 `effectTags` 필드 추가.
- [x] **DSL/조건 처리기 설계**: "HP 50% 이하" 같은 조건을 코드가 아닌 데이터로 해석할 수 있는 간단한 평가기(Evaluator) 구현.

### Phase 2: 범용 훅 엔진 구현 (Shell Engine) - [완료]
- [x] **이벤트 버스 구축**: 엔진 내부에 각 훅별로 효과를 수집하고 실행하는 시스템 구축.
- [x] **하드코딩 제거**: 기존 `engine.ts`의 데미지 계산 로직 등을 `defaultEffects` 프리셋으로 분리.
- [x] **상태 관리 최적화**: 랭크, 상태이상, 필드 효과 등을 효과 태그가 자유롭게 수정할 수 있도록 구조화.

### Phase 3: 기본 프리셋(Base Pack) 데이터 구축
- [ ] **기본 로직 데이터화**: 타입 상성, 자속 보정, 랭크 배율 등을 `system-tags.json`으로 분리.
- [ ] **주요 특성/기술 구현**: 위협(Entry), 칼춤(AfterMove), 화염방사 부가효과(AfterMove) 등을 효과 태그로 정의.
- [ ] **build-data.ts 업데이트**: 스크립트가 위키/데이터베이스에서 효과를 파싱하여 `EffectTag` 형태로 변환하도록 개선.

### Phase 4: 커스텀 규칙 GUI (Rule Editor)
- [ ] **Visual Effect Builder**: 코드를 몰라도 드롭다운과 입력창으로 `EffectTag`를 생성할 수 있는 UI.
- [ ] **실시간 적용**: 수정된 규칙을 즉시 샌드백 AI 배틀에 반영하여 테스트할 수 있는 환경 제공.
- [ ] **가져오기/내보내기**: 작성한 커스텀 규칙(JSON)을 공유할 수 있는 기능.

### Phase 5: 고도화 및 기믹 (Advanced Gimmicks)
- [ ] **복합 효과 처리**: 여러 특성과 도구가 얽혔을 때의 우선순위 및 상호작용 정교화.
- [ ] **특수 시스템 통합**: 테라스탈, 메가진화 등을 별도 코드가 아닌 '시스템 레벨 효과 태그'로 구현.

## 4. 당장 수행할 작업 (Immediate Action)
1. `src/features/battle-ai/types.ts`에 `EffectTag` 및 관련 타입 정의.
2. `engine.ts`를 이벤트를 발생시키고 효과를 실행하는 '관리자' 구조로 전면 개편 시작.
3. 가장 단순한 '랭크 변화'와 '자속 보정'부터 효과 태그 시스템으로 이관 테스트.
