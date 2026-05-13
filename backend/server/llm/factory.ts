// Phase 3.5 (D22) — createLLMFunction<I, O> generic
//
// "OSS = 에이전트 오케스트레이션 패턴" 의 핵심.
// LLM 호출 1번 = 함수 1개. 각 함수는 strict zod schema 입출력 + system prompt +
// Anthropic function calling 호환 spec (zod-to-json-schema) + retry + mockFallback.
//
// 모델은 Claude 그대로 (D9-b reaffirm via D23). wrapper 가 *교체 옵션* 을 열어둠.

import { z } from 'zod'
import { callClaude, extractJsonObject, isClaudeAvailable } from './invoke-claude'

export interface LLMFunctionMeta<I, O> {
  /** 함수 식별자 (로그/eval/Anthropic tool name 용) */
  name: string
  /** 사람 가독 한 줄 설명 — docs/AGENTS.md 카탈로그 + tool spec 용 */
  description: string
  /** 입력 zod schema */
  inputSchema: z.ZodType<I>
  /** 출력 zod schema — JSON schema 강제 + parse 후 검증 */
  outputSchema: z.ZodType<O>
  /** system prompt — prompts.ts 의 fragment 또는 함수 별 커스텀 */
  systemPrompt: string
  /**
   * 입력 → user prompt 문자열. JSON schema 강제 문구 포함 필요.
   * factory 가 자동으로 schema 를 prompt 끝에 append.
   */
  buildUserPrompt: (input: I) => string
  /**
   * 출력의 도메인 검증 (zod parse 후). e.g. recommended_ids ⊂ candidatePois.id.
   * 반환 { ok: false } 면 hallucinationDetected = true → mockFallback.
   */
  postValidate?: (output: O, input: I) => { ok: true } | { ok: false; reason: string }
  /**
   * Claude 가용 X 또는 parse/검증 fail 시 동기적 fallback.
   * 친구 톤 유지가 핵심.
   */
  mockFallback: (input: I) => O
  /** JSON 응답에서 찾을 키 hint — extractJsonObject 용 */
  jsonHintKey: string
  /**
   * retry 횟수 (default 1). 같은 prompt 로 한 번 더 시도.
   * 0 이면 retry 안 함.
   */
  retry?: number
}

export interface LLMFunctionResult<O> {
  result: O
  hallucinationDetected: boolean
  /** 디버그 — 진행 단계 */
  trace: {
    claudeUsed: boolean
    parseOk: boolean
    validateOk: boolean
    retried: number
    fallback: 'none' | 'cli_unavailable' | 'parse_failed' | 'validate_failed' | 'spawn_failed'
  }
  /** Anthropic function calling 호환 tool spec (참고용 export) */
  toolSpec?: {
    name: string
    description: string
    input_schema: Record<string, unknown>
  }
}

export interface LLMFunction<I, O> {
  (input: I): Promise<LLMFunctionResult<O>>
  meta: LLMFunctionMeta<I, O>
  /** Anthropic tool spec — 추후 function calling 통합 시 그대로 사용 */
  toolSpec: {
    name: string
    description: string
    input_schema: Record<string, unknown>
  }
}

/**
 * factory: LLM 함수 1개 생성.
 *
 * 흐름:
 *   1. inputSchema.parse(input) — 잘못된 입력은 throw
 *   2. Claude 가용 X → mockFallback
 *   3. buildUserPrompt + systemPrompt + JSON schema 안내 prompt 합성
 *   4. callClaude → extractJsonObject(hintKey) → outputSchema.parse
 *   5. parse fail or postValidate fail → retry (1회 default) → 그래도 fail → mockFallback
 */
export function createLLMFunction<I, O>(meta: LLMFunctionMeta<I, O>): LLMFunction<I, O> {
  const retry = meta.retry ?? 1
  const outputJsonSchema = z.toJSONSchema(meta.outputSchema) as Record<string, unknown>
  const inputJsonSchema = z.toJSONSchema(meta.inputSchema) as Record<string, unknown>

  const toolSpec = {
    name: meta.name,
    description: meta.description,
    input_schema: inputJsonSchema,
  }

  const fn = (async (rawInput: I): Promise<LLMFunctionResult<O>> => {
    // 1. 입력 validate
    const input = meta.inputSchema.parse(rawInput)

    const trace = {
      claudeUsed: false,
      parseOk: false,
      validateOk: false,
      retried: 0,
      fallback: 'none' as LLMFunctionResult<O>['trace']['fallback'],
    }

    const available = await isClaudeAvailable()
    if (!available) {
      trace.fallback = 'cli_unavailable'
      return {
        result: meta.mockFallback(input),
        hallucinationDetected: false,
        trace,
        toolSpec,
      }
    }

    trace.claudeUsed = true
    const schemaHint = JSON.stringify(outputJsonSchema)
    const userPrompt = meta.buildUserPrompt(input)
    const fullPrompt = `${meta.systemPrompt}

${userPrompt}

[응답 규칙]
- JSON 객체 하나만. 다른 텍스트 X.
- 아래 JSON Schema 를 정확히 만족:
${schemaHint}`

    // 2. 호출 + retry
    for (let attempt = 0; attempt <= retry; attempt++) {
      trace.retried = attempt
      try {
        const text = await callClaude(fullPrompt)
        const raw = extractJsonObject<unknown>(text, meta.jsonHintKey)
        if (raw === null) {
          trace.fallback = 'parse_failed'
          continue
        }
        const parsed = meta.outputSchema.safeParse(raw)
        if (!parsed.success) {
          trace.fallback = 'parse_failed'
          continue
        }
        trace.parseOk = true

        // 3. 도메인 validate
        if (meta.postValidate) {
          const v = meta.postValidate(parsed.data, input)
          if (!v.ok) {
            trace.fallback = 'validate_failed'
            console.warn(`[llm:${meta.name}] postValidate fail`, { reason: v.reason })
            // hallucination → 즉시 fallback (retry 해도 같은 hallucination 가능성)
            return {
              result: meta.mockFallback(input),
              hallucinationDetected: true,
              trace,
              toolSpec,
            }
          }
          trace.validateOk = true
        } else {
          trace.validateOk = true
        }

        trace.fallback = 'none'
        return {
          result: parsed.data,
          hallucinationDetected: false,
          trace,
          toolSpec,
        }
      } catch (err) {
        console.error(`[llm:${meta.name}] spawn error`, err)
        trace.fallback = 'spawn_failed'
        // retry loop 계속
      }
    }

    // 4. 모든 시도 실패 → mockFallback
    return {
      result: meta.mockFallback(input),
      hallucinationDetected: false,
      trace,
      toolSpec,
    }
  }) as LLMFunction<I, O>

  fn.meta = meta
  fn.toolSpec = toolSpec
  return fn
}
