# Fonts

이 폴더는 동행 앱이 사용하는 폰트 파일 저장소.

## 자동 로딩 (Google Fonts 패키지)

이 3 패밀리는 `@expo-google-fonts/*` 로 자동 — 파일 다운로드 불필요:

- **Noto Serif KR** (`@expo-google-fonts/noto-serif-kr`) · voice / 한글 헤딩
- **Fraunces** italic (`@expo-google-fonts/fraunces`) · Latin · 숫자
- **DM Mono** (`@expo-google-fonts/dm-mono`) · data · time

## 수동 추가 필요 — Pretendard

Pretendard 는 Google Fonts 등록은 됐지만 `@expo-google-fonts/*` 모노레포에 미포함.
수동으로 OTF/TTF 받아 이 폴더에 박아야 함.

**받는 곳:**
- https://github.com/orioncactus/pretendard/releases (latest, ~28 MB zip)
- 또는 https://fonts.google.com/specimen/Pretendard (web font 다운로드)

**필요한 파일** (각 weight 별로 1개):

```
assets/fonts/
├── Pretendard-Regular.otf   (400)
├── Pretendard-Medium.otf    (500)
└── Pretendard-SemiBold.otf  (600)
```

**파일 추가 후:**
1. `hooks/use-app-fonts.ts` 의 `pretendardSources` 주석 처리 해제
2. `bun run dev` 로 hot reload 확인

## 폰트 안 박혀도 동작은 함

Pretendard 파일이 없으면 OS의 기본 sans-serif (SF Pro / Roboto) 가 fallback.
디자인 시스템 정확도는 떨어지지만 화면은 뜸.
