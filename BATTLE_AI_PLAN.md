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
- [x] **DSL/조건 처리기 구현**: "HP 50% 이하", "random <= 25" 등의 조건을 데이터로 해석하는 평가기 구현.

### Phase 2: 범용 훅 엔진 구현 (Shell Engine) - [완료]
- [x] **이벤트 버스 구축**: 엔진 내부(`engine.ts`)에서 각 훅별로 효과를 수집하고 실행하는 시스템 구축.
- [x] **하드코딩 제거**: 화상(Burn), 마비(Paralysis) 로직을 `statuses-data.json`으로 완전히 분리.
- [x] **커스텀 데이터 병합 레이어**: `custom-*.json` 파일을 통한 실시간 데이터 오버라이딩 구현.
- [x] **능력치 계산 훅 (`onStatCalc`)**: 마비 스피드 감소 등 모든 스탯 보정치를 동적으로 처리.

### Phase 3: 기본 프리셋(Base Pack) 및 자동화 고도화
- [ ] **기본 시스템 데이터화**: 타입 상성(`TYPE_MATCHUPS`), 자속 보정(STAB) 배율 등을 JSON으로 분리.
- [ ] **기술/특성 태그 라이브러리 확장**: 더 많은 특성과 기술 부가효과를 `EffectTag` 스키마로 변환.
- [ ] **데이터 빌드 스크립트 업데이트**: `scripts/build-data.ts`가 원본 데이터에서 복잡한 효과를 태그로 자동 변환하도록 개선.

### Phase 4: 커스텀 규칙 GUI (Rule Editor)
- [ ] **Visual Effect Builder**: 코드를 몰라도 드롭다운과 입력창으로 `EffectTag`를 생성할 수 있는 UI 개발.
- [ ] **JSON 에디터 통합**: `custom-*.json` 파일들을 웹 화면에서 직접 수정하고 즉시 저장/적용하는 기능.
- [ ] **공유 기능**: 작성한 커스텀 포켓몬이나 배틀 규칙을 파일로 내보내어 타인과 공유.

### Phase 5: 엔진 고도화 및 기믹 (Advanced Gimmicks)
- [ ] **다중 대상 및 필드 효과**: 날씨, 트릭룸, 더블 배틀 등 더 넓은 범위의 효과 처리 최적화.
- [ ] **특수 시스템 통합**: 테라스탈, 메가진화 등을 시스템 레벨의 '글로벌 효과 태그'로 구현.

## 4. 수행 완료 및 향후 과제 (Completed & Next Steps)
1. **완료**: 하드코딩 없는 "데이터 주도형 엔진"의 골격 완성 및 유닛 테스트 검증.
2. **진행 예정**: 현재 TS 코드 내 상수로 존재하는 `TYPE_MATCHUPS`를 JSON으로 분리하여 완전한 커스텀 상성 시스템 구축.
3. **중기 목표**: 사용자가 직접 포켓몬의 스펙을 수정할 수 있는 UI 환경 구축.
