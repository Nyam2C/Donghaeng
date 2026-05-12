# Design System — 동행 (Donghaeng)

> "친구가 옆에서 같이 여행 짜주는 느낌 + 혼자지만 누군가와 함께 동행하는 느낌"

모든 디자인 결정은 이 한 줄을 떠받친다. 판단이 갈릴 때 묻는다: *"이게 친구가 옆에 있는 느낌을 강화하는가, 약화하는가?"*

---

## Product Context

- **What:** AI 여행 컴패니언 모바일 앱. 사용자의 여행 스타일을 분석하고, 여행지·동선·예약·실시간 리플랜·TTS 대화까지 일관된 컴패니언이 동행한다.
- **Who:** 한국어 사용자, 혼자 또는 소그룹 여행자. 계획 짜는 데 시간 안 쓰고 싶지만 취향은 명확한 사람.
- **Category:** 여행 플래너 × AI 컴패니언 (Wanderlog × Pi · Replika의 교집합, 비어있는 공간)
- **Platform:** **모바일 우선** (iOS / Android). 웹은 v2.
- **Memorable thing:** 친구가 옆에 있는 그 리듬.

---

## Brand

| | 값 |
|---|---|
| 이름 | **동행** (Donghaeng) |
| 의미 | "같이 가는 사람". 동(同, 같이) + 행(行, 가다). 여행과 함께함이 한 단어로. |
| 마크 | 두 잉크 점 (큰 점 = 사용자, 작은 점 = 동행). `logo.svg` |
| 영문 표기 | `Donghaeng` (Fraunces italic, uppercase letterspacing 0.14em) |
| 보이스 | 친근한 존댓말. "어디 가실래요?" 톤. 반말 금지, 격식 존댓말도 금지. |

---

## Aesthetic Direction

- **Direction:** Editorial Warm × 한국 전통 단청
- **Decoration level:** 의도적. 한지 텍스처, 잉크 마크, 절제된 단청 모티프.
- **Mood:** 차분하고, 사람 냄새 나고, 친구 옆에 있는 그 리듬.

### Anti-patterns (절대 금지)
- 보라/핫핑크 그라데이션
- 3-column SaaS 아이콘 그리드
- 가운데 정렬 만능
- 둥글둥글 거품 radius (전 요소 18px+ radius)
- Inter / Roboto / Space Grotesk 기본값
- Tossface 이모지 폭격
- "Built for X / Designed for Y" 마케팅 클리셰

---

## Typography

| 역할 | 폰트 | weight | 용도 |
|---|---|---|---|
| Voice (컴패니언 발화 · 한글 헤딩) | **Noto Serif KR** | 400 · 500 | "말하는 사람" |
| Latin · 숫자 강조 | **Fraunces** italic | 400 · 500 | "사람이 적어준" 숫자 |
| Body / UI / 버튼 | **Pretendard Variable** | 400 · 500 · 600 | 한국 표준 humane sans |
| Data / Time / Mono | **DM Mono** | 400 · 500 (tabular) | 정확함 |

### 로딩
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">
```

### 금지 폰트
Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Space Grotesk, Helvetica, system-ui-as-primary. AI 디자인 도구가 매번 수렴하는 함정.

### 스케일 (모바일 기준)
| 토큰 | 크기 | 폰트 |
|---|---|---|
| display | 32-44px | Noto Serif KR 500 |
| h1 (voice) | 22px | Noto Serif KR 500 |
| h2 | 18px | Noto Serif KR 500 |
| body | 14-15px | Pretendard 400 |
| caption | 11-12px | Pretendard 400 |
| data | 12-14px | DM Mono 400-500 |
| numeral accent | 18-32px | Fraunces italic 500 |

---

## Color

### Light mode (한지 + 청자)
| 토큰 | hex | 용도 |
|---|---|---|
| `--bg` | `#F5EFE3` | 한지 배경 |
| `--bg-elev` | `#FFFFFF` | 카드 · 시트 |
| `--text` | `#1F1F1F` | 먹색 본문 |
| `--text-muted` | `#6B6258` | 보조 본문 |
| `--text-soft` | `#7A7065` | 캡션 · 플레이스홀더 (WCAG AA 4.8:1) |
| `--celadon` | `#4A6FA5` | **메인 액센트** · 청자 |
| `--celadon-soft` | `#6B89B5` | 보조 액센트 |
| `--celadon-deep` | `#2E4E7F` | 진한 강조 |
| `--celadon-tint` | `rgba(74,111,165,0.08)` | 배경 톤 |
| `--moss` | `#5F8B6E` | 자연 모먼트 · success |
| `--amber` | `#E8B860` | 주의 · 돌발변수 |
| `--juhong` | `#C24A36` | **희소** 강조 (확정 등) |
| `--line` | `rgba(31,31,31,0.08)` | 디바이더 |
| `--line-strong` | `rgba(31,31,31,0.15)` | 강한 디바이더 |

### Dark mode (해질녘 직후)
| 토큰 | hex |
|---|---|
| `--bg` | `#1A1F2A` |
| `--bg-elev` | `#232938` |
| `--text` | `#F5EFE3` |
| `--text-muted` | `#B8B0A5` |
| `--celadon` | `#88A5D4` |
| `--moss` | `#88B098` |
| `--amber` | `#E8C680` |
| `--juhong` | `#E3725E` |

### 사용 규칙
1. **주홍은 희소.** 예약 확정 · "됐다" 순간에만. 한 화면에 두 곳 이상 금지.
2. **황색은 주의.** 돌발 변수 · 날씨 알림에만.
3. **녹청은 자연.** 야외 활동 · success 상태.
4. **청자가 메인.** 컴패니언 존재, 주요 CTA, 활성 탭, 강조 단어.
5. **그라데이션 금지.** 카드 썸네일 사진 자리에만 허용.

---

## Spacing

- **Base unit:** 4px
- **Scale:** 2 · 4 · 8 · 16 · 24 · 32 · 48 · 64 · 96
- **Density:** Comfortable → Spacious
- **음성 모먼트:** 위·아래 64-96px 여백 (숨 쉬는 공간)

---

## Layout

- **Approach:** 하이브리드. 컨텐츠/대화는 에디토리얼 세로 1단, 예약/데이터는 그리드.
- **Mobile:** 360px 기준, 좌우 패딩 20-24px.
- **Max content width (web):** 1200px (편안한 읽기 폭).
- **Border radius:** 8 (작음) · 12 (카드) · 16 (큰 카드) · 20 (시트) · 999 (pill)

---

## Motion

- **Approach:** 의도적. 차분한 ease-out.
- **Duration:** micro 100ms · short 200ms · medium 300-400ms · long 600ms
- **Companion breath:** 4초 사이클 idle · 2초 사이클 listening
- **Page transition:** 300ms fade + 8px 세로 슬라이드
- **금지:** 스프링 바운스, 시차 스크롤, 화려한 진입 애니메이션

### Onboarding entrance (첫 만남 화면 전용)

순차 stagger + 잉크 마크 \"hello\" 신호. 사용자가 앱 처음 켰을 때 *살아있는 product*임을 첫 1.5초에 느끼게.

| 요소 | 애니메이션 | 시작 | duration | easing |
|---|---|---|---|---|
| 잉크 마크 (96px) | scale 0.7 → 1.05 → 1.0 (살짝 overshoot, 거기서 멈춤) | 0.2s | 1.0s | cubic-bezier(0.22, 1, 0.36, 1) |
| 헤딩 (명조) | fade + 14px translateY up | 0.8s | 0.8s | ease-out |
| 본문 | fade + translateY up | 1.2s | 0.7s | ease-out |
| CTA 버튼 | fade + translateY up + 이후 soft pulse (영원) | 1.5s | 0.7s | ease-out |
| 링크 (\"계정 있어요\") | fade + translateY up | 1.8s | 0.6s | ease-out |

총 등장 시간: 약 **2.5초**. CTA pulse는 등장 후 0.7s 부터 3.2s 사이클로 무한.

**Accessibility:** `prefers-reduced-motion: reduce` 사용자엔 모든 stagger·pulse 비활성, 잉크 마크 breathing만 유지.

**금지 패턴:** `box-shadow`로 확장하는 ring(사각형 그림자 → 정사각형으로 퍼짐, 단청 둥근 마크와 안 맞음). 둥근 효과 필요하면 SVG circle radial gradient 또는 별도 absolute pseudo with `border-radius: 50%`.

**RN 구현:** `react-native-reanimated` v3의 `withSequence` + `withDelay` + `withTiming`. 메인 스레드 차단 X.

---

## Components

### Companion (잉크 마크)
- 모든 화면 상단에 **24×24 잉크 마크**. 4초 호흡 사이클.
- 발화 시: **좌측 2px 청자색 보더 + Noto Serif KR 인용**.
- TTS 화면: 96×96 + 외곽 ring pulse (2.4초).
- 마크는 `logo.svg` SVG를 인라인으로 또는 `<use>` 참조.

### 카드 (moment · rec · poi 공용)
- bg: `--bg`, border: `1px solid --line`, radius: 12-14px
- hover: `translateY(-2px)` + border `--celadon-soft`
- 사진 영역은 카드 상단 또는 좌측, ratio 16:9 또는 1:1

### 음성 인용 블록
```html
<p class="voice">바람 좋아요. <em>30분쯤</em> 더 머물러도 좋을 것 같아요.</p>
```
- Noto Serif KR · 17-22px · 좌측 2px 청자 보더 · padding-left 12px
- `<em>` 강조: italic + 청자색

### 태그 칩
- 비활성: 투명 bg · 1px `--line-strong` 보더 · `--text-muted`
- 활성: `--celadon` bg · 흰 텍스트
- Padding 8px 14px · Radius 999px (pill)

### 버튼
- Primary: `--celadon` 채움 · 흰 텍스트 · 12px radius
- Ghost: 투명 · `--line-strong` 보더 · `--text`
- Padding 12-14px · Pretendard 500
- **최소 hit area: 44×44px** (WCAG 2.5.5). 시각 크기가 작아도 padding으로 hit area 확장
- **Active state:** `scale(0.97)` + 100ms ease-out (터치 피드백)
- **Focus state (RN):** focusable + accessibilityLabel 필수 (탤백 사용자)

### 아이콘 (전부 SVG, 이모지 금지)

모든 UI 아이콘은 SVG line-art (1.6px stroke, currentColor, rounded line cap/join, 24×24 viewBox). 이모지(🎙️ 📜 ☕ 등) UI 사용 **금지** — OS마다 다르게 렌더되고 단청 톤이랑 안 맞음.

| 아이콘 | 용도 | 크기 (button context) |
|---|---|---|
| `mic` | 음성 모드 토글, TTS 마이크 | 18-22px in 44px button |
| `scroll` | 일기 모드 토글 (TTS) | 20px in 44px button |
| `map` | 지도 모드 진입 (현장 컴패니언) | 18px in 36px button |
| `coffee` | POI 카페 카테고리 | 12px in 24px pin |
| `book` | POI 책방 카테고리 | 11px in 22px pin |
| `flight` | 예약 항공 | 18px in 36px book-icon |
| `bed` | 예약 숙소 | 18px in 36px book-icon |
| `wave` | 예약 액티비티 (서핑 등) | 18px in 36px book-icon |
| `keyboard` | TTS 음성 모드 → 키보드 입력 | 20px in 44px side-btn |
| `alert` | 돌발 변수 알림 (황색) | 16px in 28px badge |

**RN 구현:** `react-native-svg` 사용. 컴포넌트로 export (`<MicIcon size={20} color="#4A6FA5"/>`). 아이콘 라이브러리(`@expo/vector-icons`)는 *fallback*으로만 — 단청 톤 안 맞는 것 많음.

**참조:** `design-preview.html`의 `<defs>` 블록에 11개 심볼 정의됨 (i-mic, i-scroll, i-map, i-coffee, i-book, i-flight, i-bed, i-wave, i-alert, i-keyboard).

### 상태 칩 (예약 등)
- 확정: `rgba(95,139,110,0.15)` bg · `--moss` 텍스트
- 결제대기: `--amber-tint` bg
- 추천: `--celadon-tint` bg · `--celadon` 텍스트

---

## Screens (11종)

### Shell · 일상의 자리
| # | 화면 | 컴패니언 상태 | 핵심 UI 패턴 |
|---|---|---|---|
| A | 온보딩 | 첫 만남 | 풀-블리드 그라데이션 + 96px 잉크 마크 + 한 문장 + 한 버튼. **탭바·헤더 없음.** |
| B | 홈 | 인사하기 · ambient | 한 문장 질문 + 다음 여행 카운트 + 4 quick action (잉크 점 배치) + ambient 알림 |
| C | 프로필 | 정체성 | 큰 잉크 마크 + 3개 stat(Fraunces) + 여행 결 태그 + **동행에게 이름 줄 수 있음** + 지난 여행 / 예약 history / 설정 sub-page들 |

### v1 탭바 구조 (4 탭)

`홈 · 여행 · 대화 · 나`

| 탭 | 진입 화면 | 사용 빈도 | 비고 |
|---|---|---|---|
| **홈** | Shell B | 매번 앱 켤 때 | 일상의 자리 |
| **여행** | 현장 컴패니언 (NORMAL/ALERT/RESCUE) · 간단 일정 시작 | 여행 중·계획 중 | 현재 여행 hub |
| **대화** | TTS 컴패니언 (음성·일기) | 자주 | 이어폰·미팅·도서관 등 모드 다양 |
| **나** | Shell C + sub-pages | 가끔 | Profile + 지난 여행 + **예약 (v2)** + 설정 |

**예약은 탭에서 제거.** 사용 빈도 낮음(여행당 1-2회). \"나\" 탭의 sub-page로 v2 본격 구현.

### Flow · 짜는 단계
| # | 화면 | 컴패니언 상태 | 핵심 UI 패턴 |
|---|---|---|---|
| 01 | 사용자 분석 | 묻기 | Tag chip 그리드 + 자유 prompt input |
| 02 | 여행지 추천 | 정리하기 | Card list + 매칭 점수 (Fraunces italic) |
| 03 | POI 리스트 | 같이 고르기 | Like/Skip row + prompt 피드백 |
| 04 | 동선 추천 | 비교하기 | 3-route + 미니맵 그라데이션 |

### ★ 일정 (특별한 방식)
| # | 화면 | 컴패니언 상태 | 핵심 UI 패턴 |
|---|---|---|---|
| ★ | **편지처럼 읽는 일정** | 편지 쓰기 | 잉크 타임라인 + 1인칭 명조 편지 본문 + 장소 점선 밑줄 + DM Mono 시간 + "— 오늘의 동행" 서명 + "답장 쓰기" |

> **이 화면이 제품의 시그니처다.** 일정표(timetable) 패러다임을 폐기하고 *친구의 편지*로 대체. 다른 어떤 여행 앱에도 없는 형태. RISK 3(에디토리얼 세로 1단)이 진짜 risk가 되는 곳.

### Flow · 떠나는 · 머무는 단계
| # | 화면 | 컴패니언 상태 | 핵심 UI 패턴 |
|---|---|---|---|
| 05 | 예약 | 정리하기 | Booking row + 상태 칩 + 합계(Fraunces) |
| 06 | 돌발 리플랜 | 알아채기 | 황색 alert + before/after plan compare |
| 07 | TTS 동반자 | 말하기 · 듣기 | 96px 잉크 마크 + wave + **탭바 없음** |

### 시나리오 간 일관성 규칙
- 컴패니언은 **모든 화면에서 같은 잉크 마크**. 크기·상태만 변함.
- **TTS(07)에서만 탭바를 숨긴다.** 대화는 그 안에만 있는 시간.
- **주홍은 7개 화면 중 1곳에서만 등장** (보통 05 예약 확정).

### 현장 컴패니언 view modes (2종 · v1)

| 모드 | 진입 | 화면 구성 | 사용 순간 |
|---|---|---|---|
| **A · Card** (default) | 첫 진입 | voice + 비대칭 카드 + 음성 토글 | 친구가 한 마디 던지는 순간 |
| **C · Map** (modal) | A 우상단 `⊕` 탭 | 상단 미니맵 + POI 핀 + 하단 드래그 시트 | "어디지?" 위치 자각 |

**전환:**
- 같은 데이터의 다른 표현. 데이터는 React Native state에 1번만, view layer만 swap.
- C 모달은 300ms ease-out slide-up
- × 또는 swipe-down으로 A 복귀
- Listening state (음성 토글 ON)는 *직교* 상태 — A/C 어디서든 적용

**v2 보류:** B Voice modal (◐ 풀스크린 음성). v1 단계엔 Listening state로 충분.

### TTS 대화 view modes (2종 · v1)

| 모드 | 진입 | 화면 구성 | 사용 순간 |
|---|---|---|---|
| **음성 모드** (default) | 탭바 "대화" 진입 | 96px 잉크 마크 + 명조 voice + wave + mic | 이어폰 끼고 듣고 말함 |
| **일기 모드** | 음성 모드 우상단 `📜` 탭 | 시간순 대화 리스트. 사용자=Pretendard dim, 동행=Noto Serif KR 명조 + 좌측 청자 보더 | 미팅 중·도서관·이어폰 X에서 읽으며 진행 |

**전환:**
- 같은 대화 데이터, 다른 표현. RN state 1개, view layer 2개.
- 일기 모드 하단 입력창 + 🎙️ → 음성 모드 복귀
- 대화 히스토리는 in-context memory에서 공유 (둘 다 같은 source)

### TTS 대화 중 변수 발생 — Voice-first, Visual-on-demand

원칙: **TTS는 voice/text first**. 친구가 말로 먼저 알리고, 사용자가 \"보여줘\" 요청할 때만 시각 자료 제공. 화면에 amber 배너 강제 띄우지 않음 (TTS는 대화 자체에 집중하는 화면).

#### 음성 모드 (default)
| 트리거 | 컴패니언 행동 | 시각 변화 | 사용자 분기 |
|---|---|---|---|
| **ALERT 자동** (OpenWeather · POI 영업종료) | voice 톤 전환 \"어, 비 와요. 카페 추천 드릴까요?\" | **잉크 마크 옆에 미세한 amber 점** (subtle cue, 호흡 색조만 amber로) | \"응 보여줘\" → 탭바 \"대화\" → \"여행\" 자동 전환 (300ms slide) / \"괜찮아\" → 음성 계속 |
| **RESCUE 사용자 발화** (\"여기 닫혔어\" \"다른 곳\") | voice \"아 그러면…\" + 즉시 대안 음성 제시 | 잉크 마크 미세 주홍 글로우 (확정 신호) | \"카드로 보여줘\" → 탭바 \"여행\" 전환 (RESCUE 카드 표시) / \"음성으로 계속\" → 그대로 |

**탭 navigation 룰:**
- *자동 navigate는 사용자 명시적 발화에 의해서만* (\"보여줘\"·\"카드로\"·\"지도로\"). 자동 ALERT 트리거만으론 화면 안 바뀜
- 사용자가 탭바 \"대화\" 재탭 = TTS 복귀, 대화 컨텍스트 그대로 (Zustand state 유실 X)
- TTS 음성 재생 중이면 백그라운드에서 계속. 탭 전환해도 음성 끊김 X
- 컴패니언 = 같은 사람. 탭 어디든 같은 잉크 마크, 같은 메모리. \"여행\" 탭에서 본 카드를 \"대화\"에서 말로 다룰 수 있음

#### 일기 모드
| 트리거 | 일기 entry 추가 | 사용자 분기 |
|---|---|---|
| **ALERT 자동** | \"11:54 · 동행: 어 비 와요. 근처 카페 추천 드릴까요?\" + \"[지도로 보기]\" 작은 청자 링크 | 링크 탭 → 현장 컴패니언 / 텍스트로 답장 → 대화 계속 |
| **RESCUE 사용자 입력** | 사용자 입력 → 동행 응답 entry + \"[대안 카드 보기]\" 옵션 링크 | 동일 |

**금지:**
- TTS 화면에 amber 배너 풀폭 (대화 톤 깨짐)
- 변수 발생 시 화면 강제 전환 (사용자 운전/걷기 중일 수 있음)
- 시각 강조 너무 크게 (잉크 마크 amber 점은 *느낌만 있게*)

**유지:**
- 모든 변수 결정은 사용자에게 선택권 (보여줘 / 음성으로만)
- 잉크 마크 글로우 색만 변경 (호흡 사이클 유지)

### 현장 컴패니언 4 카드 타입 (v1 · 같은 화면, 동적 전환)

| 타입 | 트리거 | Voice | 카드 | 시각 강조 |
|---|---|---|---|---|
| **NORMAL** | 평소 (시간·위치 기반) | "바람 좋아요. 30분쯤 더…" | 큰 추천 카드 + 작은 카드 | 청자 톤, 차분 |
| **ALERT** | 외부 변수 감지 (날씨 API · POI 영업종료 · 시간대 부적합) | "비 와요. 일정 살짝 바꿀까요?" | **상단 amber 배너** + 대안 카드 1-2개 | `--amber` 배너 (#E8B860 tint) |
| **RESCUE** | 사용자 즉시 요청 ("여기 닫혔어" · "다른 곳" · "비왔어") | "아 그러면…" — 빠른 confirmation | 주홍 톤 미세한 강조 + 대안 카드 1-2개 즉시 | `--juhong` 미세하게 (확정 신호) |
| **AWAY** | 인터넷 끊김 · 위치 못 받음 | "다시 연결되면 알려드릴게요" | 캐시된 카드 있으면 dimmed, 없으면 안내 | 호흡 정지 |

### 현장 컴패니언 5 화면 상태 (UX-level)

| 상태 | 잉크 마크 | 변경점 |
|---|---|---|
| **Success** (mockup) | 24px · 4s 호흡 | 위 4 카드 타입 중 NORMAL/ALERT/RESCUE 표시 |
| **Loading** | 24px · **2s** 호흡 (빠름) | skeleton 카드 + "둘러보고 있어요…" |
| **Empty** | 24px · 4s 호흡 | "지금은 한적하네요" + 지도 보기 링크 |
| **Listening** (음성 ON) | **96px** · 2s 호흡 + ring pulse | TTS 대화 모드 진입 (별개 화면) |

상태/카드 타입 전환은 모두 300ms ease-out fade. 다중 카드 타입이 한 세션에서 연쇄 발생 가능 (예: NORMAL → ALERT → RESCUE → NORMAL).

### 일정 변경 크기별 처리 (v1)

| 변경 크기 | 처리 경로 | 화면 |
|---|---|---|
| **작은** (1-2 곳, \"이 카페 닫혔어\") | 컴패니언 ALERT/RESCUE 카드 | 현장 컴패니언 (한 화면 안에서) |
| **중간** (반나절 일부, \"오후 다 바꿔\") | 컴패니언 카드 안 \"오후 다시 짤래?\" 링크 → 간단 일정 시작 부분 prefill | 간단 일정 시작 |
| **큰** (전체 일정, \"강릉 말고 부산\") | 컴패니언 카드 안 \"전체 다시 짤래?\" 링크 → 간단 일정 시작 전체 prefill | 간단 일정 시작 |

**v1엔 시나리오 06 (돌발 리플랜) 별도 화면 X.** 큰 변경도 \"간단 일정 시작 재진입\" 패턴으로 가벼움. before/after 일정 비교 UI는 v2 (편지 일정 paradigm 도입 후).

---

## CSS Variable Setup

```css
:root {
  --bg: #F5EFE3;
  --bg-elev: #FFFFFF;
  --text: #1F1F1F;
  --text-muted: #6B6258;
  --text-soft: #9A9085;
  --celadon: #4A6FA5;
  --celadon-soft: #6B89B5;
  --celadon-deep: #2E4E7F;
  --celadon-tint: rgba(74, 111, 165, 0.08);
  --moss: #5F8B6E;
  --amber: #E8B860;
  --juhong: #C24A36;
  --line: rgba(31, 31, 31, 0.08);
  --line-strong: rgba(31, 31, 31, 0.15);
}
[data-theme="dark"] {
  --bg: #1A1F2A;
  --bg-elev: #232938;
  --text: #F5EFE3;
  --text-muted: #B8B0A5;
  --text-soft: #6B6F7A;
  --celadon: #88A5D4;
  --moss: #88B098;
  --amber: #E8C680;
  --juhong: #E3725E;
}
```

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-12 | 디자인 시스템 v0.1 (Sunset 방향) | "친구 옆 동행감" memorable thing 확정 |
| 2026-05-12 | 단청 청자 팔레트로 전환 | 사용자 명시: "파란색 톤". CLAUDE.md 원안의 오방색과 합치 |
| 2026-05-12 | Pretendard + Noto Serif KR | 단청 팔레트와 정합한 한국 표준 |
| 2026-05-12 | MARK A (두 점) + 이름 "곁" 후보 | 마크와 이름이 시각·언어 양쪽으로 메모러블 명제 1:1 매핑 (마크 A 추천) |
| 2026-05-12 | 이름 "동행 (Donghaeng)"으로 최종 확정 | "곁"의 시적 무게보다 *직설적 명료성* 우선. 신규 사용자도 1초 안에 의미 파악. 마크는 그대로 A |
| 2026-05-12 | Shell 3종 (Onboarding · Home · Profile) 추가 | 앱이 *일상에서 열렸을 때*의 진입점이 비어있어서 추가. 홈에서 컴패니언이 한 문장으로 묻고 시작 |
| 2026-05-12 | **일정 = 편지 패러다임으로 전환** | 시간표(timetable)를 폐기. 1인칭 명조 편지 + 잉크 타임라인. 시간표 dread 회피, 메모러블 명제("친구 옆") 100% 표현. **제품 시그니처 화면** |
| 2026-05-12 | **/design-review 정적 감사** | 7 findings (HIGH 1 · MED 3 · POLISH 3). 적용: 터치 44px 일괄, `--text-soft` 4.8:1 contrast, 현장 컴패니언 5 상태 명세, active state spec. Design Score: A- · AI Slop: A |
| 2026-05-12 | **/design-shotgun · view modes 도입** | 현장 컴패니언에 A (default Card) + B (Voice modal) + C (Map modal) 3 view. 같은 데이터, 다른 표현 |
| 2026-05-12 | **B Voice modal v2 보류 + TTS 일기 모드 추가** | B는 Listening state로 충분. TTS에 일기 모드 추가 — 이어폰 X 상황에서도 대화 읽기. 사용자=Pretendard dim, 동행=명조+청자 보더 |
| 2026-05-12 | **모든 UI 아이콘 SVG line-art로 통일** | 이모지 UI 사용 금지. 11개 심볼(mic·scroll·map·coffee·book·flight·bed·wave·alert·keyboard·search) 1.6px stroke, currentColor, 24×24 viewBox. OS별 렌더 차이 제거 |
| 2026-05-12 | **간단 일정 시작 화면 = 3 진입 경로 디자인** | 도시 검색 input + 인기 8 chip + 분위기 4 카드 + 컴패니언 대화 진입점. 사용자 의도가 명확하든(검색·chip) 모호하든(분위기·대화) 한 화면에서 시작 가능 |
| 2026-05-12 | **온보딩 entrance 애니메이션 spec** | 잉크 마크 scale-overshoot · 헤딩/본문/CTA/링크 stagger fade-up · CTA soft pulse 무한. 총 등장 2.5s. RN reanimated 구현. `prefers-reduced-motion` 대응 |
| 2026-05-12 | **시나리오 06 → 현장 컴패니언 4 카드 타입으로 통합** | 별도 화면 X. NORMAL/ALERT/RESCUE/AWAY 4종이 한 화면에서 동적 전환. \"여행 중 친구가 알아채고 챙김\" 명제 강화 |
| 2026-05-12 | **TTS 변수 → Voice-first, Visual-on-demand** | TTS 화면엔 amber 배너 안 띄움. 잉크 마크 glow color만 미세 전환. 사용자 \"보여줘\" 발화 시에만 탭 \"여행\"으로 자동 navigate. 일기 모드는 entry 자동 추가 |
| 2026-05-12 | **탭바 재구성: 예약 제거** | 예약은 사용 빈도 낮음(여행당 1-2회). 탭바 \"홈/여행/예약/나\" → \"홈/여행/대화/나\". 예약은 \"나\" 탭 sub-page로 v2 본격. 대화 탭이 top-level로 (TTS는 자주 쓰는 기능) |
| 2026-05-12 | **/design-review · 일관성 정리** | 캡션 잔여 이모지 1곳 제거 · 본문 라벨 10px → 11px 일괄(13곳: 분위기 sub-text · 일기 timestamp · 일기 헤더 · 작은 카드 meta). 9px는 map 메타 라벨 한정 유지. Design Score: A · AI Slop: A |

---

## v1 스코프 경고

이 디자인 시스템은 11개 화면 전부를 가정하고 잡혔다. 다만 실제 v1을 어느 1개 기능으로 좁힐지는 **아직 결정 안 됨**. 모든 7개를 동시에 빌드하는 건 multi-year 작업. 코드 작성 전 `/office-hours`로 wedge를 좁히길 권장한다.

> *"v1으로 시장에 내놓을 1개 기능"* 정해진 다음, 그 기능 화면들을 이 시스템으로 구현하는 것이 권장 경로.
