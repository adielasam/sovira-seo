import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { isExactAssistantOwnerId } from './auth'
import { completeWithFailover, generateStructuredTaskPlan } from './ai-provider'
import { redactSecretsInText } from './crypto'
import { dispatchToMakeWebhook } from './integrations/make'
import { syncTaskToNotion } from './integrations/notion'
import { runContentAutomationPipeline } from './integrations/content-pipeline'
import { sendTelegramMessage } from './integrations/telegram'
import { getIntegrationStatusList, resolveAICredentials } from './integrations/vault'
import {
  cancelRemoteBrowserRun,
  checkLiveBrowserHealth,
  getRemoteBrowserRunStatus,
  startRemoteBrowserRun,
} from './live-browser-client'
import { CONTROLLED_TOOL_REGISTRY } from './tools/registry'
import { runServerlessWebSession } from './web-session-runner'
import {
  AssistantTaskLogRecord,
  AssistantTaskRecord,
  AssistantTaskStepRecord,
  ReadinessWarning,
} from './types'

export async function appendTaskLog(opts: {
  taskId: string
  userId: string
  level?: 'info' | 'warn' | 'error' | 'security' | 'audit'
  stepOrder?: number | null
  message: string
  metadata?: Record<string, unknown>
}) {
  const admin = createAdminClient()
  const safeMsg = redactSecretsInText(opts.message)
  await admin.from('assistant_task_logs').insert({
    task_id: opts.taskId,
    user_id: opts.userId,
    level: opts.level || 'info',
    step_order: opts.stepOrder ?? null,
    message: safeMsg,
    metadata: opts.metadata || {},
  })
}

export async function getTaskDetail(
  userId: string,
  taskId: string
): Promise<{
  task: AssistantTaskRecord
  steps: AssistantTaskStepRecord[]
  logs: AssistantTaskLogRecord[]
} | null> {
  if (!isExactAssistantOwnerId(userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()

  const [{ data: task }, { data: steps }, { data: logs }] = await Promise.all([
    admin.from('assistant_tasks').select('*').eq('id', taskId).eq('user_id', userId).maybeSingle(),
    admin
      .from('assistant_task_steps')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('step_order', { ascending: true }),
    admin
      .from('assistant_task_logs')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])

  if (!task) return null

  const typedTask = task as AssistantTaskRecord
  if (
    typedTask.external_execution_id &&
    ['running', 'waiting_human_verification', 'queued'].includes(typedTask.status)
  ) {
    const didMutate = await syncRemoteBrowserTask(userId, typedTask).catch(() => false)
    if (didMutate) {
      const [{ data: freshTask }, { data: freshSteps }, { data: freshLogs }] = await Promise.all([
        admin.from('assistant_tasks').select('*').eq('id', taskId).eq('user_id', userId).maybeSingle(),
        admin
          .from('assistant_task_steps')
          .select('*')
          .eq('task_id', taskId)
          .eq('user_id', userId)
          .order('step_order', { ascending: true }),
        admin
          .from('assistant_task_logs')
          .select('*')
          .eq('task_id', taskId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
      ])
      if (freshTask) {
        return {
          task: freshTask as AssistantTaskRecord,
          steps: (freshSteps || []) as AssistantTaskStepRecord[],
          logs: (freshLogs || []) as AssistantTaskLogRecord[],
        }
      }
    }
  }

  return {
    task: typedTask,
    steps: (steps || []) as AssistantTaskStepRecord[],
    logs: (logs || []) as AssistantTaskLogRecord[],
  }
}

async function syncRemoteBrowserTask(userId: string, task: AssistantTaskRecord): Promise<boolean> {
  if (!task.external_execution_id) return false

  const remoteRes = await getRemoteBrowserRunStatus(userId, task.external_execution_id).catch(() => null)
  if (!remoteRes?.ok || !remoteRes.run) return false

  const admin = createAdminClient()
  const run = remoteRes.run
  let mutated = false

  // Append only newly added remote log lines without duplicating across polls
  const remoteLogs = Array.isArray(run.logs) ? run.logs : []
  if (remoteLogs.length > 0) {
    const { count } = await admin
      .from('assistant_task_logs')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', task.id)
      .eq('user_id', userId)
      .contains('metadata', { remoteRunId: run.runId })

    const syncedCount = count || 0
    if (remoteLogs.length > syncedCount) {
      const newRows = remoteLogs.slice(syncedCount).map((entry, idx) => ({
        task_id: task.id,
        user_id: userId,
        level: entry.level || 'info',
        step_order: entry.stepOrder ?? null,
        message: redactSecretsInText(entry.message),
        metadata: { remoteRunId: run.runId, remoteLogIndex: syncedCount + idx },
      }))
      await admin.from('assistant_task_logs').insert(newRows)
      mutated = true
    }
  }

  if (run.status === 'running') {
    const desiredStatus = remoteRes.controlMode === 'human_control' ? 'waiting_human_verification' : 'running'
    if (task.status !== desiredStatus) {
      await admin
        .from('assistant_tasks')
        .update({ status: desiredStatus })
        .eq('id', task.id)
        .eq('user_id', userId)
      mutated = true
    }
    return mutated
  }

  if (run.status === 'completed') {
    // Claim transition atomically on assistant_jobs so concurrent polls never synthesize twice
    const { data: claimedJob } = await admin
      .from('assistant_jobs')
      .update({ status: 'completed' })
      .eq('id', task.external_execution_id)
      .eq('user_id', userId)
      .eq('status', 'running')
      .select('id')
      .maybeSingle()

    if (!claimedJob) {
      return mutated
    }

    const stepResults = Array.isArray(run.stepResults) ? run.stepResults : []
    for (const stepOut of stepResults) {
      const stepOrder = Number(stepOut.step || 1)
      await admin
        .from('assistant_task_steps')
        .update({
          status: 'completed',
          output: stepOut,
          completed_at: new Date().toISOString(),
        })
        .eq('task_id', task.id)
        .eq('user_id', userId)
        .eq('step_order', stepOrder)
    }

    // Remove bulky base64 screenshot strings from AI synthesis prompt payload
    const sanitizedForPrompt = stepResults.map((s) => {
      const clone = { ...s }
      delete clone.screenshotBase64
      return clone
    })

    let reportMarkdown = ''
    try {
      const aiCreds = await resolveAICredentials(userId)
      const synth = await completeWithFailover({
        systemPrompt:
          'You are Sovira AI Task Assistant. Summarize what the live Chromium browser observed accurately using ONLY facts present in the step outputs (finalUrl, pageTitle, authenticatedLikely, loginErrors, headings, navigationLinks, dashboardCardsAndMetrics, extractedText). Never fabricate dashboard data that was not observed.',
        prompt: `User Instruction: ${task.instruction}\n\nLive Chromium Browser Outputs:\n${JSON.stringify(sanitizedForPrompt).slice(0, 9000)}`,
        temperature: 0.2,
        maxTokens: 2500,
        credentials: aiCreds,
      })
      reportMarkdown = synth.text
    } catch {
      reportMarkdown = ''
    }

    // Mark any leftover planned synthesis step completed too
    await admin
      .from('assistant_task_steps')
      .update({
        status: 'completed',
        output: { reportMarkdown },
        completed_at: new Date().toISOString(),
      })
      .eq('task_id', task.id)
      .eq('user_id', userId)
      .eq('tool_name', 'ai_research_analysis')
      .eq('status', 'pending')

    await admin
      .from('assistant_tasks')
      .update({
        status: 'completed',
        result: {
          summary: task.plan?.summary || 'Live cloud browser task completed cleanly.',
          reportMarkdown: reportMarkdown || undefined,
          stepOutputs: stepResults,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('user_id', userId)

    await appendTaskLog({
      taskId: task.id,
      userId,
      level: 'audit',
      message: 'Live cloud browser run completed cleanly.',
    })

    return true
  }

  if (run.status === 'failed' || run.status === 'cancelled') {
    const isCancel = run.status === 'cancelled'
    const safeError = redactSecretsInText(run.error || (isCancel ? 'Cancelled by owner.' : 'Remote browser task failed.'))

    await admin
      .from('assistant_jobs')
      .update({ status: isCancel ? 'cancelled' : 'failed', last_error: safeError })
      .eq('id', task.external_execution_id)
      .eq('user_id', userId)

    await admin
      .from('assistant_tasks')
      .update({
        status: isCancel ? 'cancelled' : 'failed',
        error_code: isCancel ? 'CANCELLED' : 'REMOTE_BROWSER_ERROR',
        error_message: safeError,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .eq('user_id', userId)
      .in('status', ['running', 'waiting_human_verification', 'queued', 'cancelling'])

    return true
  }

  return mutated
}

export async function listTasks(opts: {
  userId: string
  status?: string | null
  limit?: number
}): Promise<AssistantTaskRecord[]> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()
  let query = admin
    .from('assistant_tasks')
    .select('*')
    .eq('user_id', opts.userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(100, Math.max(1, opts.limit || 40)))

  if (opts.status && opts.status !== 'all') {
    query = query.eq('status', opts.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as AssistantTaskRecord[]
}

export async function createPlannedTask(opts: {
  userId: string
  instruction: string
  conversationId?: string | null
  idempotencyKey?: string | null
  source?: 'web' | 'telegram' | 'webhook' | 'mcp' | 'chatgpt'
  attachments?: Array<{ name: string; type?: string; size?: number; summary?: string }>
}): Promise<{
  task: AssistantTaskRecord
  steps: AssistantTaskStepRecord[]
  deduplicated: boolean
}> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const admin = createAdminClient()
  const cleanInstruction = opts.instruction.trim()
  if (!cleanInstruction) {
    throw new Error('Instruction cannot be empty')
  }

  // 1. Idempotency check
  if (opts.idempotencyKey) {
    const { data: existing } = await admin
      .from('assistant_tasks')
      .select('*')
      .eq('user_id', opts.userId)
      .eq('idempotency_key', opts.idempotencyKey)
      .maybeSingle()

    if (existing) {
      const detail = await getTaskDetail(opts.userId, existing.id)
      if (detail) {
        return { task: detail.task, steps: detail.steps, deduplicated: true }
      }
    }
  }

  // 2. Insert initial planning task record
  const { data: createdTask, error: insertErr } = await admin
    .from('assistant_tasks')
    .insert({
      user_id: opts.userId,
      conversation_id: opts.conversationId || null,
      idempotency_key: opts.idempotencyKey || crypto.randomUUID(),
      instruction: cleanInstruction,
      category: 'general',
      status: 'planning',
      approval_required: true,
      approval_status: 'pending',
      source: opts.source || 'web',
      attachments: opts.attachments || [],
    })
    .select('*')
    .single()

  if (insertErr || !createdTask) {
    throw new Error(`Failed to persist task: ${insertErr?.message || 'Unknown error'}`)
  }

  await appendTaskLog({
    taskId: createdTask.id,
    userId: opts.userId,
    level: 'audit',
    message: `Task created from ${opts.source || 'web'}; generating structured plan via AI planner.`,
  })

  const planned = await generateAndSaveTaskPlan({
    taskId: createdTask.id,
    userId: opts.userId,
    instruction: cleanInstruction,
    attachments: opts.attachments,
  })

  return {
    task: planned.task || (createdTask as AssistantTaskRecord),
    steps: planned.steps,
    deduplicated: false,
  }
}

async function generateAndSaveTaskPlan(opts: {
  taskId: string
  userId: string
  instruction: string
  attachments?: Array<{ name: string; type?: string; size?: number; summary?: string }>
}): Promise<{ task: AssistantTaskRecord; steps: AssistantTaskStepRecord[] }> {
  const admin = createAdminClient()

  try {
    const [aiCreds, integrationStatuses] = await Promise.all([
      resolveAICredentials(opts.userId),
      getIntegrationStatusList(opts.userId),
    ])

    const attachmentContext =
      opts.attachments && opts.attachments.length > 0
        ? `User attached files:\n${opts.attachments.map((a) => `- ${a.name}${a.summary ? `: ${a.summary}` : ''}`).join('\n')}`
        : undefined

    const { plan, plannerMeta } = await generateStructuredTaskPlan(opts.instruction, {
      context: attachmentContext,
      credentials: aiCreds,
    })

    // Check readiness of all required integrations without faking readiness
    const statusMap = new Map(integrationStatuses.map((i) => [i.provider, i]))
    const readinessWarnings: ReadinessWarning[] = []
    for (const reqProvider of plan.requiredIntegrations) {
      const st = statusMap.get(reqProvider)
      if (st && st.status !== 'connected') {
        readinessWarnings.push({
          provider: reqProvider,
          status: st.status,
          message:
            reqProvider === 'browser_worker'
              ? 'Desktop Playwright worker is offline; approved browser step will run via serverless HTTP session unless worker starts.'
              : `${st.label} is currently ${st.status}. Supply or verify credentials in Integrations before execution.`,
        })
      }
    }

    // Persist validated steps
    const stepRows = plan.steps.map((s) => ({
      task_id: opts.taskId,
      user_id: opts.userId,
      step_order: s.stepOrder,
      title: s.title,
      tool_name: s.toolName,
      parameters: s.parameters,
      requires_approval: s.requiresApproval,
      status: 'pending',
    }))

    const { data: insertedSteps, error: stepsErr } = await admin
      .from('assistant_task_steps')
      .insert(stepRows)
      .select('*')
      .order('step_order', { ascending: true })

    if (stepsErr) {
      throw new Error(`Failed to persist task steps: ${stepsErr.message}`)
    }

    const fullPlan = {
      ...plan,
      plannerMeta,
      readinessWarnings,
      plannerMode: 'ai' as const,
    }

    const { data: updatedTask, error: updErr } = await admin
      .from('assistant_tasks')
      .update({
        category: plan.category,
        status: 'waiting_approval',
        approval_required: true,
        approval_status: 'pending',
        plan: fullPlan,
        error_code: null,
        error_message: null,
      })
      .eq('id', opts.taskId)
      .eq('user_id', opts.userId)
      .select('*')
      .single()

    if (updErr || !updatedTask) {
      throw new Error(`Failed to save planned task: ${updErr?.message}`)
    }

    await appendTaskLog({
      taskId: opts.taskId,
      userId: opts.userId,
      level: 'info',
      message: `Plan prepared using ${plannerMeta.provider} (${plannerMeta.model}) in ${plannerMeta.latencyMs}ms with ${plan.steps.length} step(s). Awaiting human approval.`,
      metadata: { plannerMeta, warnings: readinessWarnings.length },
    })

    return {
      task: updatedTask as AssistantTaskRecord,
      steps: (insertedSteps || []) as AssistantTaskStepRecord[],
    }
  } catch (err: any) {
    const safeError = redactSecretsInText(err?.message || 'Planning failed')
    const { data: failedTask } = await admin
      .from('assistant_tasks')
      .update({
        status: 'failed',
        error_code: 'PLANNING_ERROR',
        error_message: safeError,
        completed_at: new Date().toISOString(),
      })
      .eq('id', opts.taskId)
      .eq('user_id', opts.userId)
      .select('*')
      .single()

    await appendTaskLog({
      taskId: opts.taskId,
      userId: opts.userId,
      level: 'error',
      message: `Task planning failed: ${safeError}`,
    })

    return {
      task: failedTask as AssistantTaskRecord,
      steps: [],
    }
  }
}

/**
 * Atomically approves a pending task, creates a durable job in assistant_jobs,
 * and either executes lightweight non-browser steps synchronously after claiming
 * or leaves long-running jobs queued for worker/assistant-worker.ts.
 */
export async function approveTask(opts: {
  userId: string
  taskId: string
  notifyTelegram?: boolean
}): Promise<{ task: AssistantTaskRecord; alreadyProcessed: boolean; workerQueued: boolean }> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const admin = createAdminClient()

  // Atomic conditional state transition prevents duplicate approvals/execution
  const { data: approvedTask, error: updErr } = await admin
    .from('assistant_tasks')
    .update({
      status: 'queued',
      approval_status: 'approved',
      approved_by: opts.userId,
      approved_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
    })
    .eq('id', opts.taskId)
    .eq('user_id', opts.userId)
    .eq('status', 'waiting_approval')
    .eq('approval_status', 'pending')
    .select('*')
    .maybeSingle()

  if (updErr) {
    throw new Error(updErr.message)
  }

  if (!approvedTask) {
    const current = await getTaskDetail(opts.userId, opts.taskId)
    if (!current) throw new Error('Task not found')
    return { task: current.task, alreadyProcessed: true, workerQueued: false }
  }

  await appendTaskLog({
    taskId: opts.taskId,
    userId: opts.userId,
    level: 'audit',
    message: 'Task plan approved by authorised owner. Enqueuing durable job.',
  })

  // Check if any step is long-running (Playwright browser, video pipeline, Make)
  const { data: steps } = await admin
    .from('assistant_task_steps')
    .select('*')
    .eq('task_id', opts.taskId)
    .eq('user_id', opts.userId)
    .order('step_order', { ascending: true })

  const stepList = (steps || []) as AssistantTaskStepRecord[]
  const requiresPlaywright = stepList.some(
    (s) => s.tool_name === 'browser_navigate_extract' || s.tool_name === 'browser_interactive_action'
  )

  // Check if persistent worker is online
  const { data: beats } = await admin
    .from('assistant_worker_heartbeats')
    .select('worker_id, last_heartbeat_at')
    .eq('user_id', opts.userId)
    .order('last_heartbeat_at', { ascending: false })
    .limit(1)

  const workerOnline =
    Boolean(beats?.[0]?.last_heartbeat_at) &&
    Date.now() - new Date(beats![0].last_heartbeat_at).getTime() <= 45_000

  // Enqueue durable job in PostgreSQL
  const { data: jobRow, error: jobErr } = await admin
    .from('assistant_jobs')
    .insert({
      task_id: opts.taskId,
      user_id: opts.userId,
      job_type: 'execute_task',
      payload: { source: approvedTask.source, requiresPlaywright },
      status: 'queued',
      max_attempts: approvedTask.max_retries || 3,
    })
    .select('*')
    .single()

  if (jobErr) {
    throw new Error(`Failed to enqueue durable job: ${jobErr.message}`)
  }

  // Prefer persistent Live Cloud Browser VPS (Nobus) when browser steps are needed and VPS is reachable
  if (requiresPlaywright) {
    const remoteBrowser = await checkLiveBrowserHealth(opts.userId).catch(() => null)
    if (remoteBrowser?.online && remoteBrowser.liveBrowser) {
      const browserSteps = stepList.filter(
        (s) => s.tool_name === 'browser_navigate_extract' || s.tool_name === 'browser_interactive_action'
      )
      try {
        await startRemoteBrowserRun(opts.userId, {
          runId: jobRow.id,
          taskId: opts.taskId,
          steps: browserSteps.map((s) => ({
            stepOrder: s.step_order,
            toolName: s.tool_name,
            parameters: s.parameters,
          })),
        })

        const nowIso = new Date().toISOString()
        await admin
          .from('assistant_jobs')
          .update({
            status: 'running',
            locked_by: 'nobus-live-browser-vps',
            locked_at: nowIso,
            lease_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
            attempt_count: 1,
          })
          .eq('id', jobRow.id)
          .eq('user_id', opts.userId)

        const { data: runningTask } = await admin
          .from('assistant_tasks')
          .update({
            status: 'running',
            external_execution_id: jobRow.id,
            started_at: nowIso,
          })
          .eq('id', opts.taskId)
          .eq('user_id', opts.userId)
          .select('*')
          .single()

        await appendTaskLog({
          taskId: opts.taskId,
          userId: opts.userId,
          level: 'audit',
          message: `Started live cloud browser execution on ${remoteBrowser.workerHost} (run ${jobRow.id}). Open Live Browser Preview or click "Take control of the browser" anytime.`,
        })

        return {
          task: (runningTask || approvedTask) as AssistantTaskRecord,
          alreadyProcessed: false,
          workerQueued: true,
        }
      } catch (remoteErr: any) {
        await appendTaskLog({
          taskId: opts.taskId,
          userId: opts.userId,
          level: 'warn',
          message: `Live cloud browser dispatch failed (${redactSecretsInText(remoteErr?.message || 'error')}); falling back cleanly.`,
        })
      }
    }
  }

  // When the persistent desktop Playwright worker is online, delegate execution to it;
  // otherwise run immediately inside Next.js (using serverless HTTP session fallback for browser tools).
  if (workerOnline) {
    await appendTaskLog({
      taskId: opts.taskId,
      userId: opts.userId,
      level: 'info',
      message: `Job ${jobRow.id} queued for active background worker (${beats![0].worker_id}).`,
    })
    return { task: approvedTask as AssistantTaskRecord, alreadyProcessed: false, workerQueued: true }
  }

  // For lightweight synchronous AI research / Notion tasks when external worker isn't running,
  // atomically claim the queued job inside Next.js so quick reports complete immediately.
  const { data: claimedJob } = await admin
    .from('assistant_jobs')
    .update({
      status: 'running',
      locked_by: 'nextjs-inline-lightweight',
      locked_at: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
      attempt_count: 1,
    })
    .eq('id', jobRow.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle()

  if (!claimedJob) {
    return { task: approvedTask as AssistantTaskRecord, alreadyProcessed: false, workerQueued: true }
  }

  const finalTask = await executeLightweightTaskSteps({
    userId: opts.userId,
    task: approvedTask as AssistantTaskRecord,
    steps: stepList,
    jobId: claimedJob.id,
    notifyTelegram: opts.notifyTelegram ?? approvedTask.source === 'telegram',
  })

  return { task: finalTask, alreadyProcessed: false, workerQueued: false }
}

async function executeLightweightTaskSteps(opts: {
  userId: string
  task: AssistantTaskRecord
  steps: AssistantTaskStepRecord[]
  jobId: string
  notifyTelegram: boolean
}): Promise<AssistantTaskRecord> {
  const admin = createAdminClient()
  const startedAt = new Date().toISOString()

  await admin
    .from('assistant_tasks')
    .update({ status: 'running', started_at: startedAt })
    .eq('id', opts.task.id)
    .eq('user_id', opts.userId)

  const stepOutputs: Record<string, unknown>[] = []
  let reportMarkdown = ''

  try {
    const aiCreds = await resolveAICredentials(opts.userId)

    for (const step of opts.steps) {
      // Check cancellation before each step
      const { data: latest } = await admin
        .from('assistant_tasks')
        .select('cancel_requested')
        .eq('id', opts.task.id)
        .single()

      if (latest?.cancel_requested) {
        await admin
          .from('assistant_task_steps')
          .update({ status: 'cancelled' })
          .eq('id', step.id)
        throw new Error('CANCELLED_BY_USER')
      }

      await admin
        .from('assistant_task_steps')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', step.id)

      await appendTaskLog({
        taskId: opts.task.id,
        userId: opts.userId,
        stepOrder: step.step_order,
        message: `Running step ${step.step_order}: ${step.title} (${step.tool_name})`,
      })

      if (step.tool_name === 'ai_research_analysis') {
        const params = step.parameters || {}
        const completion = await completeWithFailover({
          systemPrompt: `You are Sovira AI Task Assistant preparing high-accuracy executive deliverables.
Produce a detailed, well-structured Markdown report with comparisons, pros/cons, pricing tiers (without inventing secret live numbers if unverified), and concrete recommendations.`,
          prompt: `Overall Goal: ${opts.task.instruction}\nStep: ${step.title}\nParameters: ${JSON.stringify(params)}\n\nPrior step context:\n${JSON.stringify(stepOutputs).slice(0, 3000)}`,
          temperature: 0.25,
          maxTokens: 4096,
          credentials: aiCreds,
        })
        reportMarkdown = completion.text
        const outputObj = {
          provider: completion.provider,
          model: completion.model,
          latencyMs: completion.latencyMs,
          reportMarkdown: completion.text,
          usage: completion.usage,
        }
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...outputObj })

        await admin
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: outputObj,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'notion_record_sync') {
        const params = step.parameters || {}
        const syncRes = await syncTaskToNotion({
          userId: opts.userId,
          title: String(params.title || opts.task.instruction.slice(0, 120)),
          status: String(params.status || 'Completed'),
          category: String(params.category || opts.task.category),
          summary: reportMarkdown.slice(0, 1500) || String(params.summary || ''),
          resultUrl: typeof params.resultUrl === 'string' ? params.resultUrl : undefined,
        })
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...syncRes })
        await admin
          .from('assistant_task_steps')
          .update({
            status: syncRes.synced || syncRes.skipped ? 'completed' : 'failed',
            output: syncRes as unknown as Record<string, unknown>,
            error_message: syncRes.warning || null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'make_webhook_dispatch') {
        const params = step.parameters || {}
        const dispatchRes = await dispatchToMakeWebhook({
          userId: opts.userId,
          taskId: opts.task.id,
          stepOrder: step.step_order,
          scenarioName: String(params.scenarioName || 'assistant_task'),
          eventType: String(params.eventType || 'assistant_task'),
          payload: (params.payload as Record<string, unknown>) || { reportMarkdown },
          waitForCallback: Boolean(params.waitForCallback),
        })
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...dispatchRes })
        await admin
          .from('assistant_task_steps')
          .update({
            status: dispatchRes.waitingExternal ? 'waiting_external' : 'completed',
            output: dispatchRes as unknown as Record<string, unknown>,
            completed_at: dispatchRes.waitingExternal ? null : new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'content_story_pipeline') {
        const params = step.parameters || {}
        const contentRes = await runContentAutomationPipeline({
          userId: opts.userId,
          taskId: opts.task.id,
          topic: String(params.topic || opts.task.instruction),
          targetAudience: String(params.targetAudience || 'General audience'),
          style: String(params.style || 'African storytelling documentary'),
          durationSeconds: Number(params.durationSeconds || 60),
          includeSubtitles: params.includeSubtitles !== false,
          watermarkText: String(params.watermarkText || 'Sovira Studio'),
          publishMode: (params.publishMode as any) || 'await_publish_approval',
          onStageLog: async (msg, meta) => {
            await appendTaskLog({
              taskId: opts.task.id,
              userId: opts.userId,
              stepOrder: step.step_order,
              message: msg,
              metadata: meta,
            })
          },
        })
        reportMarkdown = `# ${contentRes.story.title}\n\n${contentRes.story.script}`
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...contentRes })
        await admin
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: contentRes as unknown as Record<string, unknown>,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'browser_navigate_extract' || step.tool_name === 'browser_interactive_action') {
        const params = step.parameters || {}
        const webRes = await runServerlessWebSession({
          url: String(params.url || 'https://example.com'),
          actions: Array.isArray(params.actions) ? (params.actions as any) : undefined,
          extractSelector: typeof params.extractSelector === 'string' ? params.extractSelector : undefined,
          pauseOnAuthOrCaptcha: params.pauseOnAuthOrCaptcha !== false,
          onLog: async (msg, level) => {
            await appendTaskLog({
              taskId: opts.task.id,
              userId: opts.userId,
              level: level || 'info',
              stepOrder: step.step_order,
              message: msg,
            })
          },
        })
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...webRes })

        if (webRes.pausedForHumanVerification) {
          await admin
            .from('assistant_task_steps')
            .update({
              status: 'waiting_human_verification',
              output: webRes as unknown as Record<string, unknown>,
              error_message: webRes.pauseReason || 'Manual verification required',
            })
            .eq('id', step.id)

          await admin
            .from('assistant_jobs')
            .update({ status: 'waiting_human_verification', last_error: webRes.pauseReason || null })
            .eq('id', opts.jobId)

          const { data: pausedTask } = await admin
            .from('assistant_tasks')
            .update({
              status: 'waiting_human_verification',
              result: {
                summary: webRes.pauseReason || 'Paused cleanly for CAPTCHA / MFA verification.',
                stepOutputs,
              },
            })
            .eq('id', opts.task.id)
            .eq('user_id', opts.userId)
            .select('*')
            .single()

          return pausedTask as AssistantTaskRecord
        }

        await admin
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: webRes as unknown as Record<string, unknown>,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      }
    }

    if (!reportMarkdown && stepOutputs.length > 0) {
      try {
        const synth = await completeWithFailover({
          systemPrompt: `You are Sovira AI Task Assistant. Summarize what the execution steps observed accurately using ONLY facts present in the step outputs (finalUrl, pageTitle, authenticatedLikely, loginErrors, headings, navigationLinks, dashboardCardsAndMetrics, extractedText). Never fabricate dashboard data that was not observed. If login failed, hit a JavaScript SPA shell, or encountered a verification gate, state that clearly and explain what was seen.`,
          prompt: `User Instruction: ${opts.task.instruction}\n\nCaptured Execution Outputs:\n${JSON.stringify(stepOutputs).slice(0, 9000)}`,
          temperature: 0.2,
          maxTokens: 2500,
          credentials: aiCreds,
        })
        reportMarkdown = synth.text
      } catch (synthErr: any) {
        await appendTaskLog({
          taskId: opts.task.id,
          userId: opts.userId,
          level: 'warn',
          message: `Could not synthesize AI Markdown report: ${redactSecretsInText(synthErr?.message || 'error')}`,
        })
      }
    }

    const resultPayload = {
      summary: opts.task.plan?.summary || 'Task completed successfully.',
      reportMarkdown: reportMarkdown || undefined,
      stepOutputs,
    }

    await admin
      .from('assistant_jobs')
      .update({ status: 'completed' })
      .eq('id', opts.jobId)

    const { data: completedTask } = await admin
      .from('assistant_tasks')
      .update({
        status: 'completed',
        result: resultPayload,
        completed_at: new Date().toISOString(),
      })
      .eq('id', opts.task.id)
      .eq('user_id', opts.userId)
      .select('*')
      .single()

    await appendTaskLog({
      taskId: opts.task.id,
      userId: opts.userId,
      level: 'audit',
      message: 'All task steps completed cleanly.',
    })

    if (opts.notifyTelegram) {
      await sendTelegramMessage({
        userId: opts.userId,
        text: `<b>Task Completed</b>\n<b>Goal:</b> ${opts.task.instruction.slice(0, 180)}\n\n${reportMarkdown.slice(0, 1200)}`,
      })
    }

    return completedTask as AssistantTaskRecord
  } catch (err: any) {
    const isCancel = err?.message === 'CANCELLED_BY_USER'
    const safeMsg = isCancel
      ? 'Task cancelled by owner request.'
      : redactSecretsInText(err?.message || 'Task execution failed')

    await admin
      .from('assistant_jobs')
      .update({ status: isCancel ? 'cancelled' : 'failed', last_error: safeMsg })
      .eq('id', opts.jobId)

    const { data: endedTask } = await admin
      .from('assistant_tasks')
      .update({
        status: isCancel ? 'cancelled' : 'failed',
        error_code: isCancel ? 'CANCELLED' : 'EXECUTION_ERROR',
        error_message: safeMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', opts.task.id)
      .eq('user_id', opts.userId)
      .select('*')
      .single()

    await appendTaskLog({
      taskId: opts.task.id,
      userId: opts.userId,
      level: isCancel ? 'warn' : 'error',
      message: safeMsg,
    })

    if (opts.notifyTelegram) {
      await sendTelegramMessage({
        userId: opts.userId,
        text: `<b>Task ${isCancel ? 'Cancelled' : 'Failed'}</b>\n<b>Reason:</b> ${safeMsg}`,
      })
    }

    return endedTask as AssistantTaskRecord
  }
}

export async function rejectTask(opts: {
  userId: string
  taskId: string
  reason?: string
}): Promise<AssistantTaskRecord> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()

  const { data: updated, error } = await admin
    .from('assistant_tasks')
    .update({
      status: 'rejected',
      approval_status: 'rejected',
      error_message: opts.reason ? redactSecretsInText(opts.reason) : 'Rejected by owner before execution.',
      completed_at: new Date().toISOString(),
    })
    .eq('id', opts.taskId)
    .eq('user_id', opts.userId)
    .eq('status', 'waiting_approval')
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!updated) throw new Error('Task is not awaiting approval or not found')

  await appendTaskLog({
    taskId: opts.taskId,
    userId: opts.userId,
    level: 'audit',
    message: `Task plan rejected by owner.${opts.reason ? ` Reason: ${opts.reason}` : ''}`,
  })

  return updated as AssistantTaskRecord
}

export async function cancelTask(opts: {
  userId: string
  taskId: string
}): Promise<AssistantTaskRecord> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('assistant_tasks')
    .select('*')
    .eq('id', opts.taskId)
    .eq('user_id', opts.userId)
    .maybeSingle()

  if (!current) throw new Error('Task not found')

  if (['completed', 'failed', 'cancelled', 'rejected'].includes(current.status)) {
    return current as AssistantTaskRecord
  }

  if (current.external_execution_id) {
    await cancelRemoteBrowserRun(opts.userId, current.external_execution_id)
  }

  // If task has not started running in a worker yet (or is a remote VPS live browser run), cancel immediately
  const immediateCancel =
    Boolean(current.external_execution_id) ||
    ['planning', 'waiting_approval', 'queued', 'waiting_human_verification'].includes(current.status)
  const nextStatus = immediateCancel ? 'cancelled' : 'cancelling'

  await admin
    .from('assistant_jobs')
    .update({
      cancel_requested: true,
      ...(immediateCancel ? { status: 'cancelled' } : {}),
      last_error: 'Cancellation requested by owner',
    })
    .eq('task_id', opts.taskId)
    .eq('user_id', opts.userId)
    .in('status', ['queued', 'running', 'waiting_external', 'waiting_human_verification'])

  const { data: updated, error } = await admin
    .from('assistant_tasks')
    .update({
      cancel_requested: true,
      status: nextStatus,
      ...(immediateCancel ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', opts.taskId)
    .eq('user_id', opts.userId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  await appendTaskLog({
    taskId: opts.taskId,
    userId: opts.userId,
    level: 'warn',
    message: immediateCancel
      ? 'Task cancelled immediately prior to execution.'
      : 'Cancellation signal sent to active worker; waiting for graceful browser/process shutdown.',
  })

  return updated as AssistantTaskRecord
}

export async function retryTask(opts: {
  userId: string
  taskId: string
}): Promise<AssistantTaskRecord> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('assistant_tasks')
    .select('*')
    .eq('id', opts.taskId)
    .eq('user_id', opts.userId)
    .maybeSingle()

  if (!current) throw new Error('Task not found')

  if (!['failed', 'cancelled'].includes(current.status)) {
    throw new Error(`Only failed or cancelled tasks can be retried (current status: ${current.status})`)
  }

  if (current.retry_count >= current.max_retries) {
    throw new Error(`Retry limit reached (${current.retry_count}/${current.max_retries}). Create a new task instead.`)
  }

  // Ensure no active job still exists
  await admin
    .from('assistant_jobs')
    .update({ status: 'failed', last_error: 'Superseded by manual retry' })
    .eq('task_id', opts.taskId)
    .in('status', ['queued', 'running', 'waiting_external', 'waiting_human_verification'])

  // Check whether planning previously succeeded (steps exist) or failed during planning (0 steps)
  const { data: existingSteps } = await admin
    .from('assistant_task_steps')
    .select('id')
    .eq('task_id', opts.taskId)
    .eq('user_id', opts.userId)

  const nextRetryCount = current.retry_count + 1

  if (!existingSteps || existingSteps.length === 0) {
    const { error: resetErr } = await admin
      .from('assistant_tasks')
      .update({
        status: 'planning',
        approval_status: 'pending',
        cancel_requested: false,
        retry_count: nextRetryCount,
        error_code: null,
        error_message: null,
        completed_at: null,
      })
      .eq('id', opts.taskId)
      .eq('user_id', opts.userId)

    if (resetErr) throw new Error(resetErr.message)

    await appendTaskLog({
      taskId: opts.taskId,
      userId: opts.userId,
      level: 'audit',
      message: `Retrying planning phase (attempt ${nextRetryCount}/${current.max_retries}) after previous error.`,
    })

    const planned = await generateAndSaveTaskPlan({
      taskId: opts.taskId,
      userId: opts.userId,
      instruction: current.instruction,
      attachments: (current.attachments as any) || [],
    })

    if (planned.steps.length === 0) {
      return planned.task
    }

    const approved = await approveTask({ userId: opts.userId, taskId: opts.taskId })
    return approved.task
  }

  // Reset non-completed steps back to pending
  await admin
    .from('assistant_task_steps')
    .update({ status: 'pending', error_message: null, started_at: null, completed_at: null })
    .eq('task_id', opts.taskId)
    .in('status', ['failed', 'cancelled', 'running', 'waiting_human_verification'])

  const { data: retriedTask, error: updErr } = await admin
    .from('assistant_tasks')
    .update({
      status: 'waiting_approval',
      approval_status: 'pending',
      cancel_requested: false,
      retry_count: nextRetryCount,
      error_code: null,
      error_message: null,
      completed_at: null,
    })
    .eq('id', opts.taskId)
    .eq('user_id', opts.userId)
    .select('*')
    .single()

  if (updErr) throw new Error(updErr.message)

  await appendTaskLog({
    taskId: opts.taskId,
    userId: opts.userId,
    level: 'audit',
    message: `Task reset for retry attempt ${nextRetryCount}/${current.max_retries}; dispatching execution.`,
  })

  // Automatically re-approve & dispatch since retry was explicitly triggered by the owner
  const approved = await approveTask({ userId: opts.userId, taskId: retriedTask.id })
  return approved.task
}

/**
 * Recovers stale leases and atomically claims and processes the next queued non-browser job.
 * Called by cron, HTTP queue processor, or UI dashboard recovery trigger.
 */
export async function processNextQueuedJob(opts: {
  userId: string
}): Promise<{
  processed: boolean
  recoveredCount: number
  jobId?: string
  taskId?: string
  status?: string
  message: string
}> {
  if (!isExactAssistantOwnerId(opts.userId)) {
    throw new Error('Unauthorized owner UUID')
  }

  const admin = createAdminClient()

  // 1. Recover any stalled jobs whose worker lease expired
  const { data: recRows } = await admin.rpc('recover_stale_assistant_jobs', {
    p_owner_id: opts.userId,
  })
  const rec = Array.isArray(recRows) ? recRows[0] : recRows
  const recoveredCount = Number(rec?.recovered_count || 0)

  // 2. Claim next eligible queued job atomically using FOR UPDATE SKIP LOCKED
  const { data: claimed, error: claimErr } = await admin.rpc('claim_next_assistant_job', {
    p_worker_id: 'sovira-http-queue-processor',
    p_lease_seconds: 60,
    p_owner_id: opts.userId,
  })

  if (claimErr) {
    throw new Error(`Failed claiming job: ${claimErr.message}`)
  }

  const job = Array.isArray(claimed) ? claimed[0] : claimed
  if (!job) {
    return {
      processed: false,
      recoveredCount,
      message: recoveredCount > 0 ? `Recovered ${recoveredCount} stale job(s); no ready jobs remain.` : 'Queue is empty.',
    }
  }

  const detail = await getTaskDetail(opts.userId, job.task_id)
  if (!detail) {
    await admin
      .from('assistant_jobs')
      .update({ status: 'failed', last_error: 'Parent task record missing' })
      .eq('id', job.id)
    return {
      processed: false,
      recoveredCount,
      jobId: job.id,
      message: 'Claimed orphan job without parent task; marked failed.',
    }
  }

  const requiresPlaywright = detail.steps.some(
    (s) => s.tool_name === 'browser_navigate_extract' || s.tool_name === 'browser_interactive_action'
  )

  if (requiresPlaywright) {
    // Release lease back cleanly without consuming retry count so persistent Playwright worker picks it up
    await admin
      .from('assistant_jobs')
      .update({
        status: 'queued',
        locked_by: null,
        locked_at: null,
        lease_expires_at: null,
        attempt_count: Math.max(0, Number(job.attempt_count || 1) - 1),
      })
      .eq('id', job.id)

    await appendTaskLog({
      taskId: detail.task.id,
      userId: opts.userId,
      level: 'info',
      message: 'Job requires Playwright browser runner; kept in durable queue for worker/assistant-worker.ts.',
    })

    return {
      processed: false,
      recoveredCount,
      jobId: job.id,
      taskId: detail.task.id,
      status: 'queued',
      message: 'Task requires persistent Playwright worker process.',
    }
  }

  const finalTask = await executeLightweightTaskSteps({
    userId: opts.userId,
    task: detail.task,
    steps: detail.steps,
    jobId: job.id,
    notifyTelegram: detail.task.source === 'telegram',
  })

  return {
    processed: true,
    recoveredCount,
    jobId: job.id,
    taskId: finalTask.id,
    status: finalTask.status,
    message: `Processed queued job ${job.id} (${finalTask.status}).`,
  }
}
