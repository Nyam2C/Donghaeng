# 동행 (Donghaeng) · Claude Code Configuration

AI 여행 컴패니언 모바일 앱. "친구가 옆에서 같이 여행 짜주는 느낌"이 이 프로젝트의 단 하나의 명제다.

(전역 `~/.claude/CLAUDE.md`를 상속받음. 아래는 프로젝트 추가 룰.)

## Design System
**`docs/DESIGN.md`를 항상 먼저 읽어라.** 모든 시각·UI 결정은 거기에 정의돼있다. 폰트·색·여백·모션·컴포넌트 어느 것도 거기서 벗어나지 말 것. 일탈은 명시적 사용자 승인 필요.

핵심 토큰:
- **이름:** 동행 (Donghaeng) — 로고는 `docs/logo.svg`
- **메모러블 명제:** 친구가 옆에 있는 그 리듬
- **색:** 단청 청자 `#4A6FA5` · 한지 `#F5EFE3` · 먹 `#1F1F1F` · 주홍 `#C24A36`(희소)
- **폰트:** Pretendard(UI) · Noto Serif KR(voice) · Fraunces italic(숫자) · DM Mono(data)
- **금지:** Inter/Roboto/Space Grotesk · 보라 그라데이션 · 3-column SaaS 그리드 · 거품 radius

QA·코드 리뷰 시 `docs/DESIGN.md` 위반이 보이면 *즉시* 플래그.

## 워크플로
- 주요 단계: `/office-hours` → `/design-consultation` → 구현 → `/design-review`
- 코드 리뷰는 항상 `/review`보다 `/codex`로 시작 (외부 시각 우선)
- 배포는 `/ship` 후 반드시 `/canary`로 모니터링

## 프로젝트 특화 규칙
- 디자인 톤: 한국 감성 + 단청 모티프 (편안한 침착함, 친구의 호흡)
- 컬러 우선순위: 청자 > 한지/먹 > 녹청/황 > 주홍(희소)
- AI 슬롭 점수 **B+ 이상 필수, A 목표** — 시스템이 자기 얼굴을 가지는지가 가장 중요

## 현재 상태
- **디자인 시스템:** 확정 (`docs/DESIGN.md`)
- **프로토타입:** `docs/design-preview.html` (7 시나리오 + 로고 마크 5종)
- **엔지니어링 plan:** `docs/ENG-PLAN.md` (D1-D12 확정, Turborepo + Docker + Scaffold freeze 워크플로)
- **Phase 1 완료** — Turborepo + bun workspaces + Docker (server + ai-tts healthy) + Expo SDK 54 + husky 9 + GitHub Actions CI + Scaffold Day (~150 stub 파일 + git tag `scaffold-freeze`)
- **Phase 2 대기** (Shell, Day 5-6)

## 다음 단계
1. 머지 후 Phase 2 시작 — `phase-cycle` 하네스가 워크플로 통합 실행
2. Phase 2 (Shell) → Phase 3 (간단 일정) → ... → Phase 7 (TestFlight, ~4.6주)

## 하네스: 동행 v1 phase 워크플로

**목표:** Phase 2~7 의 *원테이크 → 확인 → 리뷰 → 머지* 사이클 자동화 + DESIGN.md/scaffold-freeze 가드.

**트리거:** Phase 진입/완료, lane 분배, agent team spawn, D 결정 추가, ENG-PLAN 갱신 같은 요청 시 `phase-cycle` 스킬을 사용하라. 단순 질문이나 read-only 탐색은 직접 응답 가능.

| 작업 유형 | 호출 |
|---|---|
| Phase 시작/완료/검증/머지 | `phase-cycle` 스킬 |
| Lane F + B + T 병렬 spawn | `phase-cycle` 또는 `scaffold-spawn` 직접 |
| 새 D 결정 + ENG-PLAN 갱신 | `eng-plan-keeper` 스킬 |
| DESIGN.md 위반 검사 | `design-guard` 에이전트 |
| scaffold-freeze 위반 검사 | `scaffold-guard` 에이전트 |

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-13 | 초기 구성 | 전체 (5 agents + 3 skills) | Phase 2-7 반복 워크플로 자동화, D12 freeze 가드 필요 |

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
