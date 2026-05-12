---
name: scaffold-spawn
description: 동행 v1 의 Lane F + Lane B + Lane T agent team spawn 패턴 wrapper. "lane spawn", "agent team 만들어", "병렬 개발 시작", "Lane F B T 동시", "phase 3 lane 분배" 같은 요청 시 호출. 또는 phase-cycle 오케스트레이터가 Phase 3+ 의 lane 작업 단계에서 자동 호출. TeamCreate + Lane 별 Task 생성 + Agent spawn + dependencies 셋업 통합. ENG-PLAN.md Interface Spec 의 해당 lane 책임 영역을 sub-agent prompt 에 자동 포함.
---

# Scaffold-Spawn — Lane Team Spawn 패턴

phase-cycle 의 Phase 2 (Lane 작업) 단계에서 사용. 4 lane (F/B/T) 중 필요한 조합을 agent team 으로 spawn.

## 사용 시점

- phase-cycle 이 자동 호출 — Phase 3, 4a, 5a 같이 2+ lane 필요한 단계
- 사용자가 직접 호출 — "Lane F + B 같이 진행해" 또는 "phase 3 lane 분배"

Lane 단일 phase (2, 4b, 5b, 6, 7) 에서는 이 스킬 미사용. 직접 Agent 도구로 1개 spawn.

## Phase 별 Lane 조합

| Phase | Lane 조합 | 의존성 |
|---|---|---|
| 3 (간단 일정) | F + B 병렬 | (없음 — types/server stub 이미 완료) |
| 4a (카드 뷰) | F + B 병렬 | B의 weather route 가 먼저 |
| 4b (지도 모달) | F 단일 | (scaffold-spawn 미사용) |
| 5a (TTS 음성) | F + B + T 3 lane | T 의 /synthesize 가 먼저 (B 의 tts-proxy 가 의존) |
| 5b (일기 모드) | F 단일 (scaffold-spawn 미사용) | — |

## 워크플로

### Step 1: TeamCreate

```
TeamCreate({
  team_name: "donghaeng-phase-{N}",
  description: "Phase {N} ({phase 짧은 제목}) — Lane {F/B/T} 병렬",
  agent_type: "phase-lead"
})
```

### Step 2: Task 분배

각 Lane 에 task 1개 생성:

```
TaskCreate({
  subject: "Lane F: Phase {N} frontend 작업",
  description: "..."  // Phase 별 채울 stub list + ENG-PLAN.md 참조
})
TaskCreate({ subject: "Lane B: Phase {N} backend 작업", ... })
TaskCreate({ subject: "Lane T: Phase {N} ai-tts 작업", ... })  // Phase 5a 만
```

Phase 5a 의존성:
```
TaskUpdate({ taskId: "B", addBlockedBy: ["T"] })  // tts-proxy 는 ai-tts 완료 후
```

### Step 3: Agent Spawn

각 Lane sub-agent 동시 spawn (모두 model: "opus"):

```
Agent({
  description: "Lane F: Phase {N} frontend",
  subagent_type: "lane-frontend",  // .claude/agents/lane-frontend.md 사용
  team_name: "donghaeng-phase-{N}",
  name: "lane-f",
  model: "opus",
  prompt: "{phase 별 specific instructions — 아래 prompt 빌더 참조}"
})

Agent({ ..., subagent_type: "lane-backend", name: "lane-b", ... })
Agent({ ..., subagent_type: "lane-tts", name: "lane-t", ... })  // Phase 5a 만
```

### Step 4: 메시지 대기

각 lane 의 SendMessage 도착 대기. 모든 lane completed 신호 후 phase-cycle 에 control 반환.

## Prompt 빌더 (Lane 별 자동 생성)

각 Lane prompt 의 구조:

```markdown
너는 {lane-name}, 동행 v1 Phase {N} 의 {역할} lane 담당.

## 컨텍스트
- repo: /mnt/c/Users/박/Desktop/hi/trip
- 브랜치: feat/phase-{N} (또는 feat/init)
- Phase {N} = "{phase title}"
- 너의 폴더: {frontend/mobile-web | backend/server | backend/ai-tts}

## 너의 책임 (Phase {N} 채울 stub)

{ENG-PLAN.md Build Steps 의 Phase {N} 블록에서 Lane 별 채울 파일 list 자동 추출}

각 stub 의 `throw new Error('NotImplemented')` 를 실제 구현으로 교체:
- 시그니처는 절대 변경 X (D12)
- shared/types/ 의 type 그대로 사용
- ENG-PLAN.md Interface Spec 의 specific 요구사항 반영 (e.g., D2 hallucination 방지, D4 intent extraction, D5 store 통합 등)

## D 결정 준수
- D2: LLM 응답 recommended_ids JSON schema 강제
- D3: foreground catchup (60분 polling, BG 의존 X)
- D4: intent extraction LLM 1-turn
- D5: user-style persist + 3 store 통합
- D6: glow state machine
- D9-b: Claude CLI spawn (Anthropic SDK X)
- D11: husky pre-commit (PATH 명시)
- D12: 시그니처 freeze (변경 X)

## 작업 흐름
1. TaskList → 너의 task → owner + in_progress
2. Read `docs/ENG-PLAN.md` Phase {N} 블록
3. Read 채울 stub files (현재 placeholder/throw)
4. body 채움 (시그니처 유지)
5. 검증: bun --filter '{workspace}' run typecheck
6. lint: bun run lint
7. (Lane B/T) docker compose restart {service} + curl 검증
8. TaskUpdate completed
9. SendMessage to team-lead 보고

## 환경
- bun: ~/.bun/bin/bun (PATH export)
- nvm: nvm use default (Node 20)
- 한국어 path: 따옴표 보존

## 출력
- 작성/수정 파일 list
- 검증 결과 (typecheck + lint + curl)
- 발견 issue
- ENG-PLAN.md 와 다르게 결정한 부분 (있다면)
```

## 검증

scaffold-spawn 호출 시 다음 확인:

1. **team_name 이 유일한지** — 같은 phase 의 이전 team 이 존재하면 TeamDelete 후 새 TeamCreate
2. **agent definition 파일 존재** — `.claude/agents/lane-{f,b,t}.md` 확인. 없으면 에러
3. **scaffold-freeze tag 존재** — 없으면 경고
4. **Phase 번호 유효 (3, 4a, 5a)** — 다른 phase 면 거부

## 에러 핸들링

| 에러 | 처리 |
|---|---|
| Lane sub-agent spawn fail | 1회 retry. 2회 fail 시 phase-cycle 에 인계 |
| Lane 간 dependency 깨짐 (e.g., T 가 fail → B 가 block 계속) | T 실패 보고 + 사용자 confirm 후 B 단독 진행 |
| 한 Lane 만 완료, 다른 Lane idle | 30분 timeout 후 사용자 알림 |
| ENG-PLAN.md Phase 블록 누락 | 사용자 confirm + 명시적 prompt 작성 |

## 종료 처리

모든 Lane completed 후:
1. SendMessage shutdown_request 각 Lane 에
2. Lane shutdown_response 대기
3. TeamDelete
4. phase-cycle 에 control 반환 (검증 단계로)

## 트리거 키워드

- "lane spawn" / "agent team"
- "병렬 개발" / "병렬 lane"
- "Lane F B T" / "Lane F + B"
- "phase N 분배" / "phase N 병렬"
- "scaffold spawn"

## 데이터 전달

- 팀 통신 — SendMessage (Lane 간 API/shape mismatch)
- 작업 추적 — TaskCreate/TaskUpdate
- 결과 보고 — SendMessage to team-lead
- 산출물 — 코드는 직접 commit (작업 디렉터리)

## 환경

- WSL Linux, 한국어 path
- TeamCreate / Agent / TaskCreate / SendMessage / TeamDelete 도구 사용
- model: "opus" 모든 lane 에 명시
