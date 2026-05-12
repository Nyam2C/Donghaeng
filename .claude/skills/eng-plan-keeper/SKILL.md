---
name: eng-plan-keeper
description: 동행 v1 의 docs/ENG-PLAN.md Decisions Log + Status + GSTACK REVIEW REPORT 자동 갱신. "ENG-PLAN 갱신", "D 결정 추가", "decisions log 박아", "phase 끝 plan 정리", "D{N} 추가" 같은 요청 시 호출. 또는 phase-cycle 오케스트레이터가 Phase 7 단계에서 자동 호출. 새 D 결정 entry 추가 + Status 라인 갱신 + Verdict 갱신 + 추가사항 bullet 추가까지 일관 처리. ENG-PLAN.md 의 형식 규칙 (Decisions Log table · Status 한 줄 · VERDICT 라인 · 추가사항 bullet) 자동 준수.
---

# Eng-Plan Keeper — ENG-PLAN.md 자동 갱신

ENG-PLAN.md (`docs/ENG-PLAN.md`) 의 4 섹션 갱신을 자동화. phase 끝마다 또는 새 D 결정 시.

## 갱신 대상 4 섹션

### 1. Decisions Log table

```markdown
| 2026-MM-DD | **D{N}: {짧은 제목}** | {Rationale 1-3 줄} |
```

table 의 마지막에 새 row 추가. 날짜는 오늘 (사용자 시스템).

### 2. Status 라인 (파일 하단)

```markdown
**Status: APPROVED (... D9-D{N} ... 반영) — Phase {N} 시작 가능. ~{X}주 후 ...**
```

D 번호 range 갱신 + 시간 추정 갱신 (필요 시).

### 3. GSTACK REVIEW REPORT 의 Eng Review row

```markdown
| Eng Review | ... | 2 | **CLEAR (PLAN)** | 2차 리뷰: {N} decisions (D1-D{N}) 완료. ... |
```

decision 카운트 갱신.

### 4. VERDICT + 추가사항 bullet

```markdown
**VERDICT:** ENG CLEARED (... D{X}-D{Y} 추가) — ...

**D{X}-D{Y} 추가사항:**
- {새 추가사항 1}
- {새 추가사항 2}
```

새 D 결정 별로 bullet 추가.

## 워크플로

### 호출 패턴 1 — 새 D 결정 추가

사용자 입력 예: "D13 추가해줘 — Mock layer + agent team 병렬 개발 결정"

1. ENG-PLAN.md Read
2. 현재 D 번호 max 확인 (정규식: `D(\d+)`)
3. 새 D 번호 = max + 1
4. 사용자에게 D entry confirm:
   - 제목 (짧음)
   - Rationale (1-3 줄)
5. 4 섹션 갱신 (Edit tool):
   - Decisions Log 새 row
   - Status 라인 D 범위 갱신
   - GSTACK 카운트 갱신
   - VERDICT 라인 + 추가사항 bullet
6. 검증 — biome format 통과 (lint 안 깨짐)
7. 변경 diff 사용자에게 표시

### 호출 패턴 2 — Phase 끝 자동 정리

phase-cycle 의 Phase 7 단계에서 호출.

1. 해당 phase 의 commit history 파싱 (e.g., `git log feat/phase-3..HEAD --oneline`)
2. 새 D 결정이 있었는지 commit message scan (`D{N}:` 패턴)
3. 있으면 위 패턴 1 진행
4. Status 의 phase 진행 표시 갱신:
   - "Phase {N-1} 완료 → Phase {N} 시작 가능"

### 호출 패턴 3 — Decisions Log 일관성 검사

사용자 입력: "ENG-PLAN 일관성 검사" 또는 정기 호출.

1. Decisions Log 의 모든 D 번호 → ENG-PLAN.md 다른 섹션 (Tech Stack, File Structure, Build Steps 등) 에서 reference 되는지 확인
2. 누락된 reference 보고
3. 갱신 안 함 (read-only). 사용자 또는 lane 에 fix 요청

## 형식 규칙 (자동 준수)

### Decisions Log row 형식

```markdown
| 2026-MM-DD | **D{N}: {제목}** | {Rationale}. {특별 강조 1-2개 줄}. {시간 영향 명시 if any} |
```

- 날짜: ISO 8601 (`YYYY-MM-DD`)
- D 번호: **bold**. 큰 변경은 `D{N}-a`, `D{N}-b` sub-entry 가능
- Rationale: 한국어. 1-3 문장. 마지막에 phase 일정 영향 (e.g., "Phase 1 +0.5일")

### Status 라인 형식

```markdown
**Status: APPROVED ({N}차 review YYYY-MM-DD, D9-D{N} {짧은 요약} 반영) — Phase {N+1} 시작 가능. ~{X.X}주 후 친구 5명 TestFlight 검증.**
```

### VERDICT 라인 형식

```markdown
**VERDICT:** ENG CLEARED ({N}차, D{X}-D{Y} 추가) — Phase {N+1} ({phase 짧은 제목}) 시작 가능. D1-D{Y} 적용된 ENG-PLAN.md 따라 빌드.

**D{X}-D{Y} 추가사항:**
- ...
```

## 입력 / 출력

**입력:**
- 호출 컨텍스트 (새 D 결정? phase 끝 정리? 일관성 검사?)
- D 결정 정보 (있다면): 제목 + rationale + 영향
- 사용자 confirm 받을 부분 (자동 inferring 어려운 경우)

**출력:**
- ENG-PLAN.md 갱신 diff
- 갱신 요약: 추가된 D entries, 갱신된 라인 수
- 일관성 issue list (있다면)

## 트리거 키워드

- "ENG-PLAN 갱신" / "ENG-PLAN 정리"
- "D 결정 추가" / "D{N} 박아" / "D{N} 추가"
- "decisions log"
- "VERDICT 갱신"
- "phase 끝 plan 정리"
- "ENG-PLAN 일관성"

## 에러 핸들링

- ENG-PLAN.md 형식 깨짐 (table parse 실패 등) → 경고 + 사용자에게 manual edit 요청
- D 번호 중복 → 자동 +1 진행
- Status 라인 위치 못 찾음 (사용자가 reformat 했을 수 있음) → 사용자 confirm
- 한국어 path → 그대로 처리 가능 (cd 따옴표 보존)

## 데이터 전달

- Edit tool — ENG-PLAN.md 부분 수정
- Read tool — 현재 상태 확인
- Write tool — 큰 reformat 시만 (드물게)

## 환경

- 한국어 path 호환 (`/박/`)
- `docs/ENG-PLAN.md` 단일 파일 대상 (다른 docs 갱신 안 함)
- biome format 안 깨지도록 trailing whitespace · indent 보존

## 테스트 시나리오

**정상 (새 D 결정):**
1. 사용자: "D14 추가 — Phase 2 끝, ink-mark Reanimated 패턴 결정"
2. ENG-PLAN.md Read → 현재 max D = 13
3. 새 D = 14
4. Decisions Log row 추가
5. Status 라인 갱신 (D9-D14 반영)
6. GSTACK Eng Review 14 decisions 갱신
7. VERDICT + 추가사항 bullet 추가
8. diff 사용자에게 표시

**에러 (D 번호 누락):**
1. 사용자: "Phase 3 끝 정리"
2. commit history scan → 새 D 결정 없음 (단순 코드 채움 phase)
3. Status 라인의 phase 진행만 갱신
4. Decisions Log 변경 없음 보고
