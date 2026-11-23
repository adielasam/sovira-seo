import { z } from 'zod'

export const TASK_STATUSES = [
  'planning',
  'waiting_approval',
  'queued',
  'running',
  'waiting_external',
  'waiting_human_verification',
  'cancelling',
  'completed',
  'failed',
  'cancelled',
  'rejected',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'not_required'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const TASK_CATEGORIES = [
  'research',
  'browser_automation',
  'content_production',
  'make_workflow',
  'notion_sync',
  'general',
] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]

export const INTEGRATION_PROVIDERS = [
  'gemini',
  'groq',
  'chatgpt_mcp',
  'openrouter',
  'telegram',
  'make',
  'notion',
  'elevenlabs',
  'creatomate',
  'google_oauth',
  'browser_worker',
] as const

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDERS)[number]

export const TOOL_NAMES = [
  'ai_research_analysis',
  'browser_navigate_extract',
  'browser_interactive_action',
  'make_webhook_dispatch',
  'notion_record_sync',
  'content_story_pipeline',
] as const

export type ToolName = (typeof TOOL_NAMES)[number]

export type AIProviderErrorType =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'AUTH_ERROR'
  | 'UPSTREAM_5XX'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'NOT_CONFIGURED'

export const taskStepPlanSchema = z.object({
  stepOrder: z.preprocess(
    (v) => (v === null || v === undefined ? 1 : Number(v)),
    z.number().int().min(1).max(20)
  ),
  title: z.string().min(2).max(200),
  description: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length >= 2 ? v.trim() : 'Execute planned assistant step'),
    z.string().min(2).max(1000)
  ),
  toolName: z.enum(TOOL_NAMES),
  parameters: z.preprocess(
    (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}),
    z.record(z.string(), z.unknown())
  ),
  requiresApproval: z.preprocess(
    (v) => (v === null || v === undefined ? true : Boolean(v)),
    z.boolean()
  ),
})

export const taskPlanSchema = z.object({
  summary: z.string().min(4).max(1000),
  category: z.preprocess(
    (v) => (typeof v === 'string' && (TASK_CATEGORIES as readonly string[]).includes(v) ? v : 'general'),
    z.enum(TASK_CATEGORIES)
  ),
  riskLevel: z.preprocess(
    (v) => (typeof v === 'string' && ['low', 'medium', 'high'].includes(v) ? v : 'medium'),
    z.enum(['low', 'medium', 'high'])
  ),
  approvalRequired: z.preprocess(
    (v) => (v === null || v === undefined ? true : Boolean(v)),
    z.boolean()
  ),
  expectedOutputs: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined).map(String) : []),
    z.array(z.string())
  ),
  requiredIntegrations: z.preprocess(
    (v) =>
      Array.isArray(v)
        ? v.filter((x) => typeof x === 'string' && (INTEGRATION_PROVIDERS as readonly string[]).includes(x))
        : [],
    z.array(z.enum(INTEGRATION_PROVIDERS))
  ),
  steps: z.array(taskStepPlanSchema).min(1).max(12),
})

export type TaskStepPlan = z.infer<typeof taskStepPlanSchema>
export type TaskPlan = z.infer<typeof taskPlanSchema>

export interface ReadinessWarning {
  provider: IntegrationProviderId
  status: string
  message: string
}

export interface AssistantTaskStepRecord {
  id: string
  task_id: string
  user_id: string
  step_order: number
  title: string
  tool_name: ToolName
  parameters: Record<string, unknown>
  requires_approval: boolean
  status: 'pending' | 'running' | 'waiting_external' | 'waiting_human_verification' | 'completed' | 'failed' | 'skipped' | 'cancelled'
  output: Record<string, unknown> | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

export interface AssistantTaskLogRecord {
  id: string
  task_id: string
  user_id: string
  level: 'info' | 'warn' | 'error' | 'security' | 'audit'
  step_order: number | null
  message: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AssistantTaskRecord {
  id: string
  user_id: string
  conversation_id: string | null
  idempotency_key: string | null
  instruction: string
  category: TaskCategory
  status: TaskStatus
  plan: TaskPlan & {
    plannerMeta?: {
      provider: string
      model: string
      latencyMs: number
      failoverUsed: boolean
      usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
    }
    readinessWarnings?: ReadinessWarning[]
    plannerMode?: 'ai' | 'deterministic_fallback'
  }
  result: Record<string, unknown> | null
  approval_required: boolean
  approval_status: ApprovalStatus
  approved_by: string | null
  approved_at: string | null
  cancel_requested: boolean
  retry_count: number
  max_retries: number
  error_code: string | null
  error_message: string | null
  execution_logs: Array<{ timestamp: string; message: string; level?: string }>
  source: 'web' | 'telegram' | 'webhook' | 'mcp' | 'chatgpt'
  external_execution_id: string | null
  attachments: Array<{ name: string; type?: string; size?: number; summary?: string }>
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export interface IntegrationStatusSummary {
  provider: IntegrationProviderId
  tier: 'core' | 'optional'
  label: string
  description: string
  enabled: boolean
  status: 'connected' | 'disconnected' | 'unconfigured' | 'error'
  configuredVia: 'env' | 'encrypted_vault' | 'both' | 'none'
  verificationMode: 'live_verified' | 'awaiting_credentials' | 'worker_offline' | 'mock_supported'
  lastTestedAt: string | null
  lastError: string | null
  secretPreview: string
  credentialFields: Array<{ key: string; label: string; placeholder: string; secret: boolean }>
  metadata: Record<string, unknown>
}
