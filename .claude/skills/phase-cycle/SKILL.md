---
name: phase-cycle
description: 동행 v1 의 매 Phase (2~7) 진입/완료 워크플로 오케스트레이터. "Phase N 시작", "Phase 2 진행", "다음 phase 가자", "phase 마무리", "phase 끝 검증", "원테이크 시작" 같은 요청 시 호출. agent team (Lane F/B/T) spawn + 검증 (typecheck/lint/docker) + guards (design-guard/scaffold-guard) + commit + push + CI 대기 + PR 머지 안내까지 통합. D12 워크플로 (원테이크 → 확인 → 리뷰 → 머지) 자동화. Phase 별 입력 list 와 검증 체크리스트 ENG-PLAN.md 에서 자동 reference. 부분 재실행 (특정 lane 만, 특정 day 만) 도 지원.
---

# Phase Cycle — 동행 v1 Phase 워크플로 오케스트레이터

매 Phase (2~7) 의 *원테이크 → 확인 → 리뷰 → 머지* 워크플로를 통합 실행. D12 결정의 핵심 운영 패턴.

## Phase 0: 컨텍스트 확인 (재호출 판별)

워크플로우 시작 시 다음 확인:

1. **현재 phase 결정** — 사용자 입력에서 phase 번호 (2~7) 파싱. 없으면 git log + ENG-PLAN.md Build Steps 로부터 추론
2. **재실행 모드 판별:**
   - 해당 phase 의 commit 이 git log 에 이미 있음 + 사용자가 "부분 수정" 또는 "다시" 요청 → **부분 재실행**
   - 해당 phase 의 commit 없음 → **초기 실행**
   - 사용자가 "phase 끝 검증만" 또는 "머지" 요청 → **검증/머지 모드**
3. **branch 확인** — `feat/init` 또는 `feat/phase-{N}` 브랜치인지. 아니면 사용자 confirm 후 새 branch
4. **scaffold-freeze tag 확인** — 존재해야 D12 가드 동작. 없으면 경고 + 사용자 confirm

## 실행 모드: 하이브리드 (팀 + 서브)

- **lane 작업 (코딩)** = 팀 모드 — scaffold-spawn 스킬 호출 → TeamCreate + Lane F/B/T
- **검증 + guards** = 서브 모드 — design-guard / scaffold-guard 병렬 spawn (run_in_background)
- **commit/push/CI** = 메인 직접 (도구 호출)

## Phase 1: Phase 별 입력 파싱

ENG-PLAN.md `docs/ENG-PLAN.md` 의 Build Steps 섹션에서 해당 Phase 의 "채울 파일 list" 와 "완료 체크리스트" 읽음.

| Phase | 핵심 작업 | Lane 구성 |
|---|---|---|
| 2 (Shell, Day 5-6) | 홈 + 잉크 마크 + 권한 | Lane F 단일 |
| 3 (간단 일정, Day 7-8) | 3 input + 첫 LLM | Lane F + Lane B |
| 4a (카드 뷰, Day 9-12) | 4 카드 타입 state machine | Lane F + Lane B |
| 4b (지도 모달, Day 13-14) | C 모달 + react-native-maps | Lane F 단일 |
| 5a (TTS 음성, Day 15-17) | 음성 모드 + intent + tts-proxy | Lane F + Lane B + Lane T |
| 5b (일기 모드, Day 18) | 대화 history view | Lane F 단일 |
| 6 (검증, Day 19-20) | 본인 + 친구 2명 manual | 단일 — manual UX |
| 7 (TestFlight, Day 21-23) | hosting + Clova + EAS Build | 단일 — deploy |

## Phase 2: Lane 작업 (코딩)

**Lane 단일 시:** Agent 도구로 직접 lane-frontend (또는 다른) 1개 spawn. team 미사용.

**Lane 2+ 병렬 시:** scaffold-spawn 스킬 호출. scaffold-spawn 이 TeamCreate + Lane spawn + Task 분배 담당.

**phase-cycle 의 역할:**
- 해당 phase 의 stub 파일 list 와 Phase별 채울 내용을 sub-agent 에게 명확히 전달
- ENG-PLAN.md Interface Spec + Build Steps 의 해당 phase 블록을 참조 명시
- 완료 메시지 대기 (SendMessage from lanes)

## Phase 3: 검증 (자동)

매 Phase 끝 체크리스트 자동 실행:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && export PATH="$HOME/.bun/bin:$PATH"
cd /mnt/c/Users/박/Desktop/hi/trip

# 1. typecheck — 4 workspace 모두 pass
bun run typecheck

# 2. lint — Biome clean
bun run lint

# 3. docker endpoints — server + tts healthy
docker compose up -d
sleep 5
docker compose ps
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/health
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8000/health

# 4. Phase 별 단위 테스트 (Phase 4 이상)
bun run test  # vitest + promptfoo eval

# 5. Phase 별 manual UX 안내 (사용자에게)
echo "Phase {N} manual 검증:"
echo "- bun run mobile  # iOS/Android/web 디바이스에서 화면 확인"
echo "- 해당 phase 의 완료 체크리스트 확인 (ENG-PLAN.md)"
```

자동 검증 중 fail 시:
- typecheck fail → lane-frontend 또는 lane-backend 에 fix 요청 (specific error 첨부)
- lint fail → `bun run lint:fix` 시도 → 자동 fix 안 되면 lane 호출
- docker fail → docker compose logs 분석 + lane-backend / lane-tts 호출

## Phase 4: Guards (병렬 spawn — 서브 에이전트)

검증 통과 후 design-guard + scaffold-guard 병렬 호출:

```
Agent(design-guard, run_in_background=true, prompt="Phase {N} 끝, frontend/mobile-web/ 전체 검사 → violation list")
Agent(scaffold-guard, run_in_background=true, prompt="scaffold-freeze..HEAD 검사 → freeze 위반 list")
```

두 결과 대기:
- **CRITICAL 0 인 경우** → Phase 5 (commit) 진행
- **CRITICAL 있음** → 사용자에게 보고 + fix 옵션 제시 + 머지 차단

## Phase 5: Commit + Push

guards 통과 후:

1. `git status` 확인
2. 의도된 파일만 stage (절대 `git add -A` 안 함 — secret 누출 방지)
3. Commit message 형식:
   ```
   feat(phase-{N}): {phase 짧은 제목}

   {3-5 줄 핵심 변경 사항}
   
   D 결정 반영: D{X}{,Y...}
   
   검증:
   - bun run typecheck: pass
   - bun run lint: pass
   - docker endpoints: server/tts healthy
   - design-guard: clean
   - scaffold-guard: clean
   
   Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
   ```
4. `git push origin <branch>`
5. CI Monitor 시작 (gh pr checks polling)

## Phase 6: CI 대기 + 머지 안내

Monitor 도구로 CI 결과 대기:

```
while true; do
  out=$(gh pr checks {PR#} 2>/dev/null)
  if ! echo "$out" | grep -q "pending"; then
    echo "----- FINAL -----"
    echo "$out"
    break
  fi
  sleep 30
done
```

결과:
- **CI green** → 사용자에게 머지 옵션 제시 (web 또는 `gh pr merge`)
- **CI fail** → 로그 분석 + 자동 fix 시도 → 안 되면 lane 호출

머지 후:
- `git checkout main && git pull`
- 새 phase branch 생성 권장 (e.g., `feat/phase-3`)
- ENG-PLAN.md 갱신 안내 (eng-plan-keeper 스킬 호출)

## Phase 7: 다음 phase 준비

- ENG-PLAN.md Status 갱신 (eng-plan-keeper 호출)
- 다음 phase 의 prerequisites 체크 (예: Phase 5 → Clova 앱 승인 필요)
- Phase 별 추가 의존성 install 권장 (예: Phase 4b — react-native-maps native pod)

## 부분 재실행 (특정 lane / day 만)

사용자 입력 패턴:
- "lane-frontend 만 다시" → Lane F 만 spawn, 검증 + guards + commit
- "Phase 4a 검증만" → Phase 3-7 만 실행 (코딩 skip)
- "design-guard 만 돌려" → design-guard 호출 (검증/commit 없이)

## 워크플로 다이어그램

```
사용자: "Phase 3 시작"
   │
   ▼
[Phase 0] 컨텍스트 확인 (재실행? 새 phase?)
   │
   ▼
[Phase 1] 입력 파싱 (ENG-PLAN.md Build Steps Phase 3 블록)
   │
   ▼
[Phase 2] Lane 작업 — scaffold-spawn (Lane F + Lane B 병렬)
   │      (Lane 완료 알림 대기)
   ▼
[Phase 3] 검증 — typecheck + lint + docker (자동)
   │      (fail 시 lane 호출 + retry)
   ▼
[Phase 4] Guards — design-guard + scaffold-guard (병렬 sub-agent)
   │      (CRITICAL 0 확인)
   ▼
[Phase 5] Commit + Push
   │
   ▼
[Phase 6] CI Monitor + 머지 안내
   │
   ▼
[Phase 7] ENG-PLAN.md 갱신 (eng-plan-keeper) + 다음 phase 준비
```

## 트리거 키워드

이 스킬이 자동 호출되어야 하는 표현:
- "Phase N 시작" / "Phase N 진행" / "Phase N 끝"
- "다음 phase" / "다음 day"
- "phase 마무리" / "phase 끝 검증"
- "원테이크 시작" / "원테이크 사이클"
- "Lane F/B/T spawn" / "agent team"
- "scaffold 채우기"
- "phase 머지"
- "Day {n} 시작" / "Day {n} 끝"

## 데이터 전달

**팀 모드 (lane 작업):**
- TaskCreate — phase 별 task. Lane 사이 dependency (blockedBy) 명시
- SendMessage — lane 간 API/shape 합의
- 파일 — 코드는 직접 commit (작업 디렉터리)

**서브 모드 (guards):**
- 반환값 — design-guard / scaffold-guard 보고서 markdown 수집
- `_workspace/guards/` 디렉터리 — 큰 보고서는 파일로 저장 (사후 검증 추적)

## 에러 핸들링

| 에러 | 처리 |
|---|---|
| typecheck fail | 해당 workspace 의 lane 에 fix 요청 (1회 retry) |
| lint fail | `bun run lint:fix` 자동 → 그래도 fail 이면 lane 호출 |
| docker compose down | `docker compose up -d --build` → 그래도 안 되면 사용자에게 |
| CI fail (post-push) | log 분석 → fix → re-push (lane 호출 또는 직접) |
| guards CRITICAL | 머지 차단 + 사용자 confirm → 새 D 결정 필요 |
| Lane sub-agent fail | 1 회 retry. 2회 fail 시 사용자에게 인계 |
| scaffold-freeze 미존재 | 경고 + main 기준 fallback |

## 테스트 시나리오

**정상 (Phase 2 시작 → 완료):**
1. 사용자: "Phase 2 시작"
2. Phase 0 → 새 phase, branch=feat/init
3. Phase 1 → ENG-PLAN.md Phase 2 블록 파싱
4. Phase 2 → Lane F 단일 spawn (홈 + 잉크 마크 + 권한)
5. Lane F 완료 SendMessage
6. Phase 3 → typecheck/lint/docker 모두 green
7. Phase 4 → guards 모두 clean
8. Phase 5 → commit "feat(phase-2): Shell 화면" + push
9. Phase 6 → CI green
10. Phase 7 → eng-plan-keeper 호출 → 머지 안내

**에러 (CRITICAL violation 시):**
1. Phase 4 guards 결과 — design-guard 가 Inter 폰트 violation CRITICAL 1건
2. phase-cycle 가 fix 옵션 제시 → 사용자 confirm
3. Lane F 재호출 (fix 요청 + violation 첨부)
4. Phase 3 재시작 (검증)
5. Phase 4 → clean → 진행

## 환경 가정

- WSL Linux, 한국어 path
- bun in `~/.bun/bin/bun`
- nvm v20 (`nvm use default` for husky hooks)
- Docker compose up 가능 상태
- git tag `scaffold-freeze` 박혀 있음
- gh CLI 로 PR 조작 가능
