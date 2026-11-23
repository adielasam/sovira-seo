import { z } from 'zod'
import {
  IntegrationProviderId,
  TaskPlan,
  taskPlanSchema,
  ToolName,
  TOOL_NAMES,
} from '../types'

const nullableOptionalString = (maxLen: number) =>
  z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : String(v).slice(0, maxLen)),
    z.string().max(maxLen).optional()
  )

const nullableBooleanDefault = (defaultVal: boolean) =>
  z.preprocess(
    (v) => (v === null || v === undefined ? defaultVal : Boolean(v)),
    z.boolean()
  )

const nullableProfileId = z.preprocess(
  (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : 'default'),
  z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/)
)

const normalizeBrowserActionType = (v: unknown) => {
  if (typeof v !== 'string') return 'wait'
  const lower = v.toLowerCase().trim()
  if (['navigate', 'click', 'fill', 'select', 'wait', 'screenshot', 'download'].includes(lower)) {
    return lower
  }
  if (['type', 'input', 'enter', 'write'].includes(lower)) return 'fill'
  if (['submit', 'press', 'tap'].includes(lower)) return 'click'
  if (['goto', 'open', 'visit'].includes(lower)) return 'navigate'
  return 'wait'
}

export const aiResearchAnalysisParamsSchema = z.object({
  topic: z.string().min(2).max(500),
  focusAreas: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined).map((x) => String(x).slice(0, 200)) : []),
    z.array(z.string().max(200)).max(10)
  ),
  outputFormat: z.preprocess(
    (v) => (typeof v === 'string' && ['report', 'comparison_table', 'action_checklist', 'summary'].includes(v) ? v : 'report'),
    z.enum(['report', 'comparison_table', 'action_checklist', 'summary'])
  ),
})

export const browserNavigateExtractParamsSchema = z.object({
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Only http/https URLs allowed'),
  extractSelector: nullableOptionalString(200),
  captureScreenshot: nullableBooleanDefault(true),
  profileId: nullableProfileId,
})

export const browserInteractiveActionParamsSchema = z.object({
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Only http/https URLs allowed'),
  actions: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z
      .array(
        z.object({
          type: z.preprocess(
            normalizeBrowserActionType,
            z.enum(['navigate', 'click', 'fill', 'select', 'wait', 'screenshot', 'download'])
          ),
          selector: nullableOptionalString(250),
          valueKey: nullableOptionalString(100),
          value: nullableOptionalString(2000),
        })
      )
      .max(25)
  ),
  profileId: nullableProfileId,
  pauseOnAuthOrCaptcha: nullableBooleanDefault(true),
})

export const makeWebhookDispatchParamsSchema = z.object({
  scenarioName: z.string().min(2).max(150),
  eventType: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length >= 2 ? v.trim() : 'assistant_task'),
    z.string().min(2).max(100)
  ),
  payload: z.preprocess(
    (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}),
    z.record(z.string(), z.unknown())
  ),
  waitForCallback: nullableBooleanDefault(false),
})

export const notionRecordSyncParamsSchema = z.object({
  title: z.string().min(2).max(300),
  status: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : 'In Progress'),
    z.string().max(60)
  ),
  category: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : 'Assistant Task'),
    z.string().max(60)
  ),
  summary: nullableOptionalString(2000),
  resultUrl: z.preprocess(
    (v) => (typeof v === 'string' && /^https?:\/\//i.test(v.trim()) ? v.trim() : undefined),
    z.string().url().optional()
  ),
  pageId: nullableOptionalString(100),
})

export const contentStoryPipelineParamsSchema = z.object({
  topic: z.string().min(2).max(400),
  targetAudience: z.string().max(200).default('General audience'),
  style: z.string().max(120).default('African storytelling documentary'),
  durationSeconds: z.number().int().min(15).max(600).default(60),
  includeSubtitles: z.boolean().default(true),
  watermarkText: z.string().max(60).default('Sovira Studio'),
  publishMode: z.enum(['draft_only', 'youtube_private', 'await_publish_approval']).default('await_publish_approval'),
})

export interface ToolDefinition {
  name: ToolName
  label: string
  description: string
  longRunning: boolean
  defaultRequiresApproval: boolean
  riskLevel: 'low' | 'medium' | 'high'
  requiredIntegrations: IntegrationProviderId[]
  parametersSchema: z.ZodTypeAny
}

export const CONTROLLED_TOOL_REGISTRY: Record<ToolName, ToolDefinition> = {
  ai_research_analysis: {
    name: 'ai_research_analysis',
    label: 'AI Research & Structured Report',
    description: 'Researches, compares, analyzes, and compiles structured markdown reports using Sovira core AI (Groq / Gemini / optional OpenRouter).',
    longRunning: false,
    defaultRequiresApproval: false,
    riskLevel: 'low',
    requiredIntegrations: [],
    parametersSchema: aiResearchAnalysisParamsSchema,
  },
  browser_navigate_extract: {
    name: 'browser_navigate_extract',
    label: 'Browser Navigation & Extraction (Playwright)',
    description: 'Opens a URL in an isolated Playwright worker profile, extracts structured text, and captures a screenshot.',
    longRunning: true,
    defaultRequiresApproval: true,
    riskLevel: 'medium',
    requiredIntegrations: ['browser_worker'],
    parametersSchema: browserNavigateExtractParamsSchema,
  },
  browser_interactive_action: {
    name: 'browser_interactive_action',
    label: 'Browser Interactive Workflow (Playwright)',
    description: 'Executes controlled clicks, form entries, uploads/downloads in Playwright; pauses cleanly for MFA or CAPTCHA.',
    longRunning: true,
    defaultRequiresApproval: true,
    riskLevel: 'high',
    requiredIntegrations: ['browser_worker'],
    parametersSchema: browserInteractiveActionParamsSchema,
  },
  make_webhook_dispatch: {
    name: 'make_webhook_dispatch',
    label: 'Make.com Pro Scenario Trigger',
    description: 'Sends an authenticated, HMAC-signed webhook payload to Make.com Pro with correlation and callback tracking.',
    longRunning: true,
    defaultRequiresApproval: true,
    riskLevel: 'medium',
    requiredIntegrations: ['make'],
    parametersSchema: makeWebhookDispatchParamsSchema,
  },
  notion_record_sync: {
    name: 'notion_record_sync',
    label: 'Notion Task & Content Sync',
    description: 'Creates or updates a Notion database record for task tracking and completed asset links (non-fatal if offline).',
    longRunning: false,
    defaultRequiresApproval: true,
    riskLevel: 'low',
    requiredIntegrations: ['notion'],
    parametersSchema: notionRecordSyncParamsSchema,
  },
  content_story_pipeline: {
    name: 'content_story_pipeline',
    label: 'Automated Content & Video Production Pipeline',
    description: 'Executes story, storyboard, ElevenLabs narration, visuals, Creatomate render, subtitles, SEO metadata, and YouTube upload.',
    longRunning: true,
    defaultRequiresApproval: true,
    riskLevel: 'high',
    requiredIntegrations: ['elevenlabs', 'creatomate', 'google_oauth'],
    parametersSchema: contentStoryPipelineParamsSchema,
  },
}

export function getRegisteredTool(toolName: string): ToolDefinition | null {
  if ((TOOL_NAMES as readonly string[]).includes(toolName)) {
    return CONTROLLED_TOOL_REGISTRY[toolName as ToolName]
  }
  return null
}

/**
 * Validates a full AI-generated plan against the controlled tool allow-list and per-tool schemas.
 */
export function validateTaskPlan(rawPlan: unknown): TaskPlan {
  const parsedPlan = taskPlanSchema.parse(rawPlan)

  const validatedSteps = parsedPlan.steps.map((step, index) => {
    const tool = getRegisteredTool(step.toolName)
    if (!tool) {
      throw new Error(`Disallowed tool referenced in plan: ${step.toolName}`)
    }
    // Validate and normalize tool-specific parameters safely (strip unknown dangerous keys)
    const validatedParams = tool.parametersSchema.parse(step.parameters || {}) as Record<string, unknown>

    return {
      ...step,
      stepOrder: index + 1,
      parameters: validatedParams,
      requiresApproval: step.requiresApproval ?? tool.defaultRequiresApproval,
    }
  })

  const inferredIntegrations = new Set<IntegrationProviderId>(parsedPlan.requiredIntegrations)
  let anyRequiresApproval = parsedPlan.approvalRequired
  for (const step of validatedSteps) {
    const def = CONTROLLED_TOOL_REGISTRY[step.toolName]
    def.requiredIntegrations.forEach((p) => inferredIntegrations.add(p))
    if (step.requiresApproval || def.defaultRequiresApproval) {
      anyRequiresApproval = true
    }
  }

  return {
    ...parsedPlan,
    approvalRequired: anyRequiresApproval,
    requiredIntegrations: Array.from(inferredIntegrations),
    steps: validatedSteps,
  }
}

export function describeToolRegistryForPlanner(): string {
  return Object.values(CONTROLLED_TOOL_REGISTRY)
    .map(
      (t) =>
        `- ${t.name} (${t.label}): ${t.description} [longRunning=${t.longRunning}, risk=${t.riskLevel}, integrations=${t.requiredIntegrations.join(',')}]`
    )
    .join('\n')
}
