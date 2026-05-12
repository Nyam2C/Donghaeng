# 동행 (Donghaeng) · Claude Code Configuration

AI 여행 컴패니언 모바일 앱. "친구가 옆에서 같이 여행 짜주는 느낌"이 이 프로젝트의 단 하나의 명제다.

(전역 `~/.claude/CLAUDE.md`를 상속받음. 아래는 프로젝트 추가 룰.)

## Design System
**`DESIGN.md`를 항상 먼저 읽어라.** 모든 시각·UI 결정은 거기에 정의돼있다. 폰트·색·여백·모션·컴포넌트 어느 것도 거기서 벗어나지 말 것. 일탈은 명시적 사용자 승인 필요.

핵심 토큰:
- **이름:** 동행 (Donghaeng) — 로고는 `logo.svg`
- **메모러블 명제:** 친구가 옆에 있는 그 리듬
- **색:** 단청 청자 `#4A6FA5` · 한지 `#F5EFE3` · 먹 `#1F1F1F` · 주홍 `#C24A36`(희소)
- **폰트:** Pretendard(UI) · Noto Serif KR(voice) · Fraunces italic(숫자) · DM Mono(data)
- **금지:** Inter/Roboto/Space Grotesk · 보라 그라데이션 · 3-column SaaS 그리드 · 거품 radius

QA·코드 리뷰 시 DESIGN.md 위반이 보이면 *즉시* 플래그.

## 워크플로
- 주요 단계: `/office-hours` → `/design-consultation` → 구현 → `/design-review`
- 코드 리뷰는 항상 `/review`보다 `/codex`로 시작 (외부 시각 우선)
- 배포는 `/ship` 후 반드시 `/canary`로 모니터링

## 프로젝트 특화 규칙
- 디자인 톤: 한국 감성 + 단청 모티프 (편안한 침착함, 친구의 호흡)
- 컬러 우선순위: 청자 > 한지/먹 > 녹청/황 > 주홍(희소)
- AI 슬롭 점수 **B+ 이상 필수, A 목표** — 시스템이 자기 얼굴을 가지는지가 가장 중요

## 현재 상태
- **디자인 시스템:** 확정 (DESIGN.md)
- **프로토타입:** `design-preview.html` (7 시나리오 + 로고 마크 5종)
- **코드:** 미작성. v1 스코프 미확정.

## 다음 단계 (권장)
1. `/office-hours` 다시 돌려서 7개 시나리오 중 v1 wedge 1개로 좁히기
2. 좁혀진 v1 기능에 대해 `/plan-eng-review`로 아키텍처 확정
3. 그 다음 코드 작성

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
