import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { redactSecretsInText } from './crypto'
import { AIProviderErrorType, TaskPlan } from './types'
import { describeToolRegistryForPlanner, validateTaskPlan } from './tools/registry'

export interface ResolvedAICredentials {
  openrouterApiKey?: string
  openrouterModel?: string
  geminiApiKey?: string
  groqApiKey?: string
}

export interface AICompletionOptions {
  systemPrompt: string
  prompt: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
  abortSignal?: AbortSignal
  credentials?: ResolvedAICredentials
}

export interface AICompletionResult {
  text: string
  provider: 'openrouter' | 'gemini' | 'groq'
  model: string
  latencyMs: number
  failoverUsed: boolean
  attempts: Array<{ provider: string; model: string; status: 'success' | 'failed'; errorType?: AIProviderErrorType; message?: string }>
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

export function classifyAIError(error: unknown, httpStatus?: number): {
  errorType: AIProviderErrorType
  retryable: boolean
  message: string
} {
  const rawMessage = error instanceof Error ? error.message : String(error || 'Unknown AI provider error')
  const message = redactSecretsInText(rawMessage)
  const lower = message.toLowerCase()

  if (httpStatus === 401 || httpStatus === 403 || lower.includes('unauthorized') || lower.includes('invalid api key') || lower.includes('unauthenticated')) {
    return { errorType: 'AUTH_ERROR', retryable: false, message }
  }
  if (httpStatus === 429 || lower.includes('rate limit') || lower.includes('quota') || lower.includes('too many requests')) {
    return { errorType: 'RATE_LIMIT', retryable: true, message }
  }
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('timed out')) {
    return { errorType: 'TIMEOUT', retryable: true, message }
  }
  if ((httpStatus && httpStatus >= 500) || lower.includes('bad gateway') || lower.includes('service unavailable') || lower.includes('internal server error')) {
    return { errorType: 'UPSTREAM_5XX', retryable: true, message }
  }
  if (lower.includes('econnreset') || lower.includes('fetch failed') || lower.includes('enotfound') || lower.includes('network')) {
    return { errorType: 'NETWORK_ERROR', retryable: true, message }
  }
  return { errorType: 'VALIDATION_ERROR', retryable: false, message }
}

function combineSignals(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  if (!externalSignal) return timeoutSignal
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeoutSignal, externalSignal])
  }
  return externalSignal
}

async function callOpenRouter(opts: {
  apiKey: string
  model: string
  systemPrompt: string
  prompt: string
  temperature: number
  maxTokens: number
  signal: AbortSignal
}) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.sovira.com.ng',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Sovira AI Task Assistant',
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.prompt },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
    signal: opts.signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    const classified = classifyAIError(new Error(`OpenRouter HTTP ${res.status}: ${errText}`), res.status)
    const err = new Error(classified.message) as Error & { status?: number; errorType?: AIProviderErrorType }
    err.status = res.status
    err.errorType = classified.errorType
    throw err
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('OpenRouter returned empty response content')
  }

  return {
    text: content,
    usage: {
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
      totalTokens: data?.usage?.total_tokens,
    },
  }
}

/**
 * Executes text generation using Sovira core providers (Groq + Google Gemini)
 * and optional OpenRouter (tried first only when explicitly configured).
 */
export async function completeWithFailover(opts: AICompletionOptions): Promise<AICompletionResult> {
  const timeoutMs = opts.timeoutMs ?? 25000
  const temperature = opts.temperature ?? 0.2
  const maxTokens = opts.maxTokens ?? 4096

  const openrouterKey = opts.credentials?.openrouterApiKey || process.env.OPENROUTER_API_KEY
  const openrouterModel = opts.credentials?.openrouterModel || process.env.OPENROUTER_PRIMARY_MODEL || 'anthropic/claude-3.5-sonnet'
  const geminiKey = opts.credentials?.geminiApiKey || process.env.GEMINI_API_KEY
  const groqKey = opts.credentials?.groqApiKey || process.env.GROQ_API_KEY

  const attempts: AICompletionResult['attempts'] = []
  const startedAll = Date.now()
  let primaryConfiguredAndFailed = false

  // 1. Optional OpenRouter (only invoked if explicitly configured)
  if (openrouterKey) {
    const maxOpenRouterTries = 2
    for (let i = 0; i < maxOpenRouterTries; i++) {
      if (opts.abortSignal?.aborted) {
        throw new Error('Task execution aborted by cancellation request')
      }
      const start = Date.now()
      try {
        const res = await callOpenRouter({
          apiKey: openrouterKey,
          model: openrouterModel,
          systemPrompt: opts.systemPrompt,
          prompt: opts.prompt,
          temperature,
          maxTokens,
          signal: combineSignals(timeoutMs, opts.abortSignal),
        })
        attempts.push({ provider: 'openrouter', model: openrouterModel, status: 'success' })
        return {
          text: res.text,
          provider: 'openrouter',
          model: openrouterModel,
          latencyMs: Date.now() - start,
          failoverUsed: false,
          attempts,
          usage: res.usage,
        }
      } catch (err: any) {
        primaryConfiguredAndFailed = true
        const classified = classifyAIError(err, err?.status)
        attempts.push({
          provider: 'openrouter',
          model: openrouterModel,
          status: 'failed',
          errorType: classified.errorType,
          message: classified.message,
        })
        if (!classified.retryable || i === maxOpenRouterTries - 1) break
        await new Promise((r) => setTimeout(r, 700 * (i + 1)))
      }
    }
  }

  // 2. Core Provider A: Groq (existing working Sovira @ai-sdk/groq models)
  if (groqKey) {
    if (opts.abortSignal?.aborted) {
      throw new Error('Task execution aborted by cancellation request')
    }
    const groq = createGroq({ apiKey: groqKey })
    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']
    for (const modelName of groqModels) {
      const start = Date.now()
      try {
        const result = await generateText({
          model: groq(modelName),
          system: opts.systemPrompt,
          prompt: opts.prompt,
          temperature,
          maxTokens,
          abortSignal: combineSignals(timeoutMs, opts.abortSignal),
        })
        if (result.text && result.text.trim().length > 0) {
          attempts.push({ provider: 'groq', model: modelName, status: 'success' })
          return {
            text: result.text,
            provider: 'groq',
            model: modelName,
            latencyMs: Date.now() - start,
            failoverUsed: primaryConfiguredAndFailed,
            attempts,
            usage: {
              promptTokens: result.usage?.promptTokens,
              completionTokens: result.usage?.completionTokens,
              totalTokens: result.usage?.totalTokens,
            },
          }
        }
      } catch (err: any) {
        primaryConfiguredAndFailed = true
        const classified = classifyAIError(err, err?.statusCode)
        attempts.push({
          provider: 'groq',
          model: modelName,
          status: 'failed',
          errorType: classified.errorType,
          message: classified.message,
        })
      }
    }
  }

  // 3. Core Provider B: Google Gemini (reusing @ai-sdk/google)
  if (geminiKey) {
    if (opts.abortSignal?.aborted) {
      throw new Error('Task execution aborted by cancellation request')
    }
    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash']
    const google = createGoogleGenerativeAI({ apiKey: geminiKey })
    for (const modelName of geminiModels) {
      const start = Date.now()
      try {
        const result = await generateText({
          model: google(modelName),
          system: opts.systemPrompt,
          prompt: opts.prompt,
          temperature,
          maxTokens,
          abortSignal: combineSignals(timeoutMs, opts.abortSignal),
        })
        if (result.text && result.text.trim().length > 0) {
          attempts.push({ provider: 'gemini', model: modelName, status: 'success' })
          return {
            text: result.text,
            provider: 'gemini',
            model: modelName,
            latencyMs: Date.now() - start,
            failoverUsed: primaryConfiguredAndFailed,
            attempts,
            usage: {
              promptTokens: result.usage?.promptTokens,
              completionTokens: result.usage?.completionTokens,
              totalTokens: result.usage?.totalTokens,
            },
          }
        }
      } catch (err: any) {
        const classified = classifyAIError(err, err?.statusCode)
        attempts.push({
          provider: 'gemini',
          model: modelName,
          status: 'failed',
          errorType: classified.errorType,
          message: classified.message,
        })
      }
    }
  }

  if (attempts.length === 0) {
    throw new Error('No AI provider key is configured. Set GROQ_API_KEY or GEMINI_API_KEY in server environment.')
  }

  const summary = attempts
    .map((a) => `${a.provider}(${a.model}): ${a.errorType || 'FAILED'} - ${a.message}`)
    .join(' | ')
  throw new Error(`All AI providers failed after ${Date.now() - startedAll}ms. ${redactSecretsInText(summary)}`)
}

function extractJsonObject(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
    }
    throw new Error('Planner did not return valid JSON structure')
  }
}

export async function generateStructuredTaskPlan(
  instruction: string,
  opts?: {
    context?: string
    credentials?: ResolvedAICredentials
    abortSignal?: AbortSignal
  }
): Promise<{
  plan: TaskPlan
  plannerMeta: {
    provider: string
    model: string
    latencyMs: number
    failoverUsed: boolean
    attempts: AICompletionResult['attempts']
    usage?: AICompletionResult['usage']
  }
}> {
  const systemPrompt = `You are the Sovira AI Task Planner for a private single-user executive assistant.
Your job is ONLY to plan the user's requested task using the STRICT allow-listed tool registry below.
Do NOT execute actions, do NOT invent tools outside the registry, and do NOT emit code scripts.

ALLOW-LISTED TOOLS:
${describeToolRegistryForPlanner()}

Output strictly valid JSON matching this exact schema (no markdown commentary outside JSON):
{
  "summary": "Clear 1-2 sentence plan summary",
  "category": "research | browser_automation | content_production | make_workflow | notion_sync | general",
  "riskLevel": "low | medium | high",
  "approvalRequired": true,
  "expectedOutputs": ["Output item 1", "Output item 2"],
  "requiredIntegrations": [],
  "steps": [
    {
      "stepOrder": 1,
      "title": "Short step title",
      "description": "What this step performs",
      "toolName": "ai_research_analysis",
      "parameters": { "topic": "...", "focusAreas": ["..."], "outputFormat": "report" },
      "requiresApproval": true
    }
  ]
}

PLANNING PRIORITY RULES:
- Prefer "ai_research_analysis" with "requiredIntegrations": [] by default for research, analysis, strategy, comparisons, scripts, summaries, and reports.
- ONLY include optional external tools (make_webhook_dispatch, notion_record_sync, content_story_pipeline, browser_navigate_extract, browser_interactive_action) if the user explicitly requests that external action, website automation, or video rendering.

CRITICAL PARAMETER RULES BY TOOL:
- ai_research_analysis: { "topic": string, "focusAreas": string[], "outputFormat": "report"|"comparison_table"|"action_checklist"|"summary" }
- browser_navigate_extract: { "url": "https://...", "extractSelector"?: string, "captureScreenshot": true, "profileId": "default" }
- browser_interactive_action: { "url": "https://...", "actions": [{ "type": "navigate"|"click"|"fill"|"select"|"wait"|"screenshot"|"download", "selector"?: string, "value"?: string }], "profileId": "default", "pauseOnAuthOrCaptcha": true }
- make_webhook_dispatch: { "scenarioName": string, "eventType": string, "payload": object, "waitForCallback": boolean }
- notion_record_sync: { "title": string, "status": string, "category": string, "summary"?: string }
- content_story_pipeline: { "topic": string, "targetAudience": string, "style": string, "durationSeconds": number, "includeSubtitles": boolean, "watermarkText": string, "publishMode": "draft_only"|"youtube_private"|"await_publish_approval" }
- For website login and dashboard inspection tasks, use a SINGLE "browser_interactive_action" step starting at the user-supplied URL with "fill" actions for the credentials and "click" to submit. Do NOT add a second step with a guessed "/dashboard" URL; the browser runner automatically follows the site's post-login redirect and extracts the dashboard.

Always set approvalRequired: true whenever external integrations, browser actions, Notion writes, Make webhooks, or content publishing are involved.`

  const prompt = opts?.context
    ? `Context:\n${opts.context}\n\nUser Instruction:\n${instruction}`
    : `User Instruction:\n${instruction}`

  const completion = await completeWithFailover({
    systemPrompt,
    prompt,
    temperature: 0.15,
    maxTokens: 2500,
    timeoutMs: 30000,
    abortSignal: opts?.abortSignal,
    credentials: opts?.credentials,
  })

  const rawJson = extractJsonObject(completion.text)
  const validatedPlan = validateTaskPlan(rawJson)

  return {
    plan: validatedPlan,
    plannerMeta: {
      provider: completion.provider,
      model: completion.model,
      latencyMs: completion.latencyMs,
      failoverUsed: completion.failoverUsed,
      attempts: completion.attempts,
      usage: completion.usage,
    },
  }
}
