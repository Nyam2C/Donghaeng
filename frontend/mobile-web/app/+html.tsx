import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

/**
 * Expo Router 의 customize HTML (SDK 54+).
 *
 * - children 에 expo-router 가 #root + bundle script 자동 inject
 * - public/index.html 보다 정석 — script override 위험 X
 * - DESIGN.md 의 google fonts CSS link 패턴 (design-preview.html 과 동일)
 * - theme/fonts.family 토큰 키 (NotoSerifKR, Fraunces-Italic, DMMono, Pretendard)
 *   → google fonts 정식 family name 으로 @font-face alias
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>동행 · Donghaeng</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,500&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />

        <ScrollViewStyleReset />

        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SSR inline style — 내부 static string */}
        <style dangerouslySetInnerHTML={{ __html: fontAliases }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

// theme/fonts.family 토큰 키 → google fonts family name alias
const fontAliases = `
@font-face {
  font-family: 'NotoSerifKR';
  src: local('Noto Serif KR'), local('NotoSerifKR');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Fraunces-Italic';
  src: local('Fraunces');
  font-weight: 400 500;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: 'DMMono';
  src: local('DM Mono'), local('DMMono');
  font-weight: 400 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Pretendard';
  src: local('Pretendard Variable'), local('Pretendard');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
`
