// Phase 3.5 (D22, D23) — Claude Code CLI spawn wrapper
//
// 본질: D9-b 의 Bun.spawn(['claude', ...]) 그대로 (D23 reaffirm — 모델 교체 X).
// 변경 = *호출 방식* 의 함수형 도구화. 기존 routes/llm.ts 의 callClaude /
// isClaudeAvailable / extractJsonObject 를 그대로 이전.

let cachedAvailable: boolean | null = null

/**
 * Claude CLI 가용성 — 한 번만 체크 후 cache.
 * `claude --version` 의 exit code 가 0 이면 true.
 */
export async function isClaudeAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable
  try {
    const proc = Bun.spawn(['claude', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const code = await proc.exited
    cachedAvailable = code === 0
  } catch {
    cachedAvailable = false
  }
  return cachedAvailable
}

/**
 * Claude CLI 단발 호출 — stdout 텍스트 전체 반환.
 * `-p` (prompt) + `--output-format=text` 로 응답만 받음.
 */
export async function callClaude(prompt: string): Promise<string> {
  const proc = Bun.spawn(['claude', '-p', '--output-format=text', prompt], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text
}

/**
 * Claude 텍스트 응답에서 JSON 객체들을 balanced-brace counter 로 추출.
 * 코드펜스/노트 둘러싸인 경우에도 동작.
 *
 * 중첩된 객체/배열 안에서도 안전 (regex 으론 nested 가 불가능).
 */
export function extractBalancedObjects(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = -1
  let inStr = false
  let esc = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        out.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }
  return out
}

/**
 * 추출된 객체들에서 hint 키를 포함하는 마지막 JSON 을 parse 시도.
 * Claude 가 응답 끝에 최종 JSON 을 두는 패턴이라 *역순* 탐색.
 *
 * @param text Claude stdout
 * @param hintKey 결과 JSON 에 반드시 포함되어야 하는 키 (e.g. "recommended_ids" / "cities")
 */
export function extractJsonObject<T = unknown>(text: string, hintKey: string): T | null {
  const matches = extractBalancedObjects(text).filter((s) => s.includes(`"${hintKey}"`))
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(matches[i]) as T
    } catch {
      // continue
    }
  }
  return null
}
