import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { classifyAIError, completeWithFailover } from '../lib/assistant/ai-provider'
import { getConfiguredOwnerUserId } from '../lib/assistant/auth'
import { redactSecretsInText } from '../lib/assistant/crypto'
import { runContentAutomationPipeline } from '../lib/assistant/integrations/content-pipeline'
import { dispatchToMakeWebhook } from '../lib/assistant/integrations/make'
import { syncTaskToNotion } from '../lib/assistant/integrations/notion'
import { sendTelegramMessage } from '../lib/assistant/integrations/telegram'
import { resolveAICredentials } from '../lib/assistant/integrations/vault'
import { AssistantTaskRecord, AssistantTaskStepRecord } from '../lib/assistant/types'
import { runIsolatedBrowserTask } from './browser-runner'

function loadEnvLocalFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

loadEnvLocalFile()

const WORKER_ID = process.env.ASSISTANT_WORKER_ID || `sovira-worker-${os.hostname()}-${process.pid}`
const POLL_MS = Math.max(1500, Number(process.env.ASSISTANT_WORKER_POLL_MS || 4000))
const LEASE_SECONDS = Math.max(30, Number(process.env.ASSISTANT_WORKER_LEASE_SECONDS || 90))
const HEARTBEAT_MS = 15000

let shuttingDown = false
let activeJobCount = 0

function createWorkerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Worker requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function logWorkerStep(
  supabase: SupabaseClient,
  opts: {
    taskId: string
    userId: string
    level?: 'info' | 'warn' | 'error' | 'security' | 'audit'
    stepOrder?: number | null
    message: string
    metadata?: Record<string, unknown>
  }
) {
  await supabase.from('assistant_task_logs').insert({
    task_id: opts.taskId,
    user_id: opts.userId,
    level: opts.level || 'info',
    step_order: opts.stepOrder ?? null,
    message: redactSecretsInText(opts.message),
    metadata: opts.metadata || {},
  })
}

async function sendHeartbeat(supabase: SupabaseClient, ownerId: string, status: 'online' | 'draining' | 'offline') {
  await supabase.from('assistant_worker_heartbeats').upsert(
    {
      worker_id: WORKER_ID,
      user_id: ownerId,
      hostname: os.hostname(),
      pid: process.pid,
      status,
      active_jobs: activeJobCount,
      version: '1.0.0',
      last_heartbeat_at: new Date().toISOString(),
    },
    { onConflict: 'worker_id' }
  )
}

async function processClaimedJob(
  supabase: SupabaseClient,
  ownerId: string,
  job: { id: string; task_id: string; attempt_count: number; max_attempts: number }
) {
  const abortController = new AbortController()
  let leaseTimer: NodeJS.Timeout | null = null

  // Lease renewal + live cancellation check every 15s
  leaseTimer = setInterval(async () => {
    try {
      const { data } = await supabase.rpc('renew_assistant_job_lease', {
        p_job_id: job.id,
        p_worker_id: WORKER_ID,
        p_lease_seconds: LEASE_SECONDS,
        p_owner_id: ownerId,
      })
      const row = Array.isArray(data) ? data[0] : data
      if (row?.cancel_requested || !row?.renewed) {
        abortController.abort()
      }
    } catch {
      // Keep running unless lease truly expires
    }
  }, HEARTBEAT_MS)

  try {
    const [{ data: taskRow }, { data: stepRows }] = await Promise.all([
      supabase.from('assistant_tasks').select('*').eq('id', job.task_id).eq('user_id', ownerId).single(),
      supabase
        .from('assistant_task_steps')
        .select('*')
        .eq('task_id', job.task_id)
        .eq('user_id', ownerId)
        .order('step_order', { ascending: true }),
    ])

    const task = taskRow as AssistantTaskRecord
    const steps = (stepRows || []) as AssistantTaskStepRecord[]
    if (!task) {
      await supabase.from('assistant_jobs').update({ status: 'failed', last_error: 'Parent task missing' }).eq('id', job.id)
      return
    }

    await supabase
      .from('assistant_tasks')
      .update({ status: 'running', started_at: task.started_at || new Date().toISOString() })
      .eq('id', task.id)
      .eq('user_id', ownerId)

    await logWorkerStep(supabase, {
      taskId: task.id,
      userId: ownerId,
      level: 'audit',
      message: `Worker ${WORKER_ID} claimed durable job ${job.id} (attempt ${job.attempt_count}/${job.max_attempts}).`,
    })

    const stepOutputs: Record<string, unknown>[] = []
    let reportMarkdown = ''
    let waitingExternal = false
    let pausedHumanVerify = false

    for (const step of steps) {
      if (step.status === 'completed') {
        if (step.output) stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...step.output })
        continue
      }

      if (abortController.signal.aborted) {
        await supabase.from('assistant_task_steps').update({ status: 'cancelled' }).eq('id', step.id)
        throw new Error('CANCELLED_BY_USER')
      }

      // Check database cancel_requested explicitly before starting step
      const { data: freshTask } = await supabase
        .from('assistant_tasks')
        .select('cancel_requested')
        .eq('id', task.id)
        .single()
      if (freshTask?.cancel_requested) {
        abortController.abort()
        await supabase.from('assistant_task_steps').update({ status: 'cancelled' }).eq('id', step.id)
        throw new Error('CANCELLED_BY_USER')
      }

      await supabase
        .from('assistant_task_steps')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', step.id)

      await logWorkerStep(supabase, {
        taskId: task.id,
        userId: ownerId,
        stepOrder: step.step_order,
        message: `Executing step ${step.step_order}: ${step.title} [${step.tool_name}]`,
      })

      if (step.tool_name === 'ai_research_analysis') {
        const aiCreds = await resolveAICredentials(ownerId)
        const completion = await completeWithFailover({
          systemPrompt:
            'You are Sovira AI Task Assistant. Deliver rigorous, structured Markdown comparisons, tables, and recommendations.',
          prompt: `Instruction: ${task.instruction}\nStep: ${step.title}\nParameters: ${JSON.stringify(step.parameters)}\nPrior outputs: ${JSON.stringify(stepOutputs).slice(0, 3000)}`,
          temperature: 0.25,
          maxTokens: 4096,
          abortSignal: abortController.signal,
          credentials: aiCreds,
        })
        reportMarkdown = completion.text
        const out = {
          provider: completion.provider,
          model: completion.model,
          latencyMs: completion.latencyMs,
          reportMarkdown: completion.text,
          usage: completion.usage,
        }
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...out })
        await supabase
          .from('assistant_task_steps')
          .update({ status: 'completed', output: out, completed_at: new Date().toISOString() })
          .eq('id', step.id)
      } else if (step.tool_name === 'browser_navigate_extract' || step.tool_name === 'browser_interactive_action') {
        const params = step.parameters || {}
        const browserResult = await runIsolatedBrowserTask({
          taskId: task.id,
          stepOrder: step.step_order,
          url: String(params.url || 'https://example.com'),
          profileId: String(params.profileId || 'default'),
          extractSelector: typeof params.extractSelector === 'string' ? params.extractSelector : undefined,
          captureScreenshot: params.captureScreenshot !== false,
          actions: Array.isArray(params.actions) ? params.actions : undefined,
          pauseOnAuthOrCaptcha: params.pauseOnAuthOrCaptcha !== false,
          abortSignal: abortController.signal,
          onLog: async (msg, level) => {
            await logWorkerStep(supabase, {
              taskId: task.id,
              userId: ownerId,
              level: level || 'info',
              stepOrder: step.step_order,
              message: msg,
            })
          },
        })

        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...browserResult })

        if (browserResult.pausedForHumanVerification) {
          pausedHumanVerify = true
          await supabase
            .from('assistant_task_steps')
            .update({
              status: 'waiting_human_verification',
              output: browserResult as unknown as Record<string, unknown>,
              error_message: browserResult.pauseReason || 'Manual verification required',
            })
            .eq('id', step.id)
          break
        }

        await supabase
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: browserResult as unknown as Record<string, unknown>,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'make_webhook_dispatch') {
        const params = step.parameters || {}
        const dispatch = await dispatchToMakeWebhook({
          userId: ownerId,
          taskId: task.id,
          stepOrder: step.step_order,
          scenarioName: String(params.scenarioName || 'assistant_task'),
          eventType: String(params.eventType || 'assistant_task'),
          payload: (params.payload as Record<string, unknown>) || { reportMarkdown },
          waitForCallback: Boolean(params.waitForCallback),
          abortSignal: abortController.signal,
        })
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...dispatch })
        await supabase
          .from('assistant_tasks')
          .update({ external_execution_id: dispatch.executionId })
          .eq('id', task.id)
        if (dispatch.waitingExternal) {
          waitingExternal = true
          await supabase
            .from('assistant_task_steps')
            .update({
              status: 'waiting_external',
              output: dispatch as unknown as Record<string, unknown>,
            })
            .eq('id', step.id)
          break
        }
        await supabase
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: dispatch as unknown as Record<string, unknown>,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'notion_record_sync') {
        const params = step.parameters || {}
        const syncRes = await syncTaskToNotion({
          userId: ownerId,
          title: String(params.title || task.instruction.slice(0, 120)),
          status: String(params.status || 'Completed'),
          category: String(params.category || task.category),
          summary: reportMarkdown.slice(0, 1500) || String(params.summary || ''),
          resultUrl: typeof params.resultUrl === 'string' ? params.resultUrl : undefined,
          abortSignal: abortController.signal,
        })
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...syncRes })
        await supabase
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: syncRes as unknown as Record<string, unknown>,
            error_message: syncRes.warning || null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      } else if (step.tool_name === 'content_story_pipeline') {
        const params = step.parameters || {}
        const contentRes = await runContentAutomationPipeline({
          userId: ownerId,
          taskId: task.id,
          topic: String(params.topic || task.instruction),
          targetAudience: String(params.targetAudience || 'General audience'),
          style: String(params.style || 'African storytelling documentary'),
          durationSeconds: Number(params.durationSeconds || 60),
          includeSubtitles: params.includeSubtitles !== false,
          watermarkText: String(params.watermarkText || 'Sovira Studio'),
          publishMode: (params.publishMode as any) || 'await_publish_approval',
          abortSignal: abortController.signal,
          onStageLog: async (msg, meta) => {
            await logWorkerStep(supabase, {
              taskId: task.id,
              userId: ownerId,
              stepOrder: step.step_order,
              message: msg,
              metadata: meta,
            })
          },
        })
        reportMarkdown = `# ${contentRes.story.title}\n\n${contentRes.story.script}`
        stepOutputs.push({ step: step.step_order, tool: step.tool_name, ...contentRes })
        await supabase
          .from('assistant_task_steps')
          .update({
            status: 'completed',
            output: contentRes as unknown as Record<string, unknown>,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id)
      }
    }

    if (pausedHumanVerify) {
      await supabase
        .from('assistant_jobs')
        .update({ status: 'waiting_human_verification' })
        .eq('id', job.id)
      await supabase
        .from('assistant_tasks')
        .update({
          status: 'waiting_human_verification',
          result: { summary: 'Paused for manual CAPTCHA/MFA/login verification.', stepOutputs },
        })
        .eq('id', task.id)
      await sendTelegramMessage({
        userId: ownerId,
        text: `<b>Human Verification Required</b>\nTask "${task.instruction.slice(0, 120)}" paused cleanly on a login/CAPTCHA gate.`,
      })
      return
    }

    if (waitingExternal) {
      await supabase.from('assistant_jobs').update({ status: 'waiting_external' }).eq('id', job.id)
      await supabase
        .from('assistant_tasks')
        .update({
          status: 'waiting_external',
          result: { summary: 'Waiting for authenticated callback from Make.com scenario.', stepOutputs },
        })
        .eq('id', task.id)
      return
    }

    await supabase.from('assistant_jobs').update({ status: 'completed' }).eq('id', job.id)
    await supabase
      .from('assistant_tasks')
      .update({
        status: 'completed',
        result: {
          summary: task.plan?.summary || 'Task completed cleanly by background worker.',
          reportMarkdown: reportMarkdown || undefined,
          stepOutputs,
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    await logWorkerStep(supabase, {
      taskId: task.id,
      userId: ownerId,
      level: 'audit',
      message: `Job ${job.id} completed cleanly.`,
    })

    if (task.source === 'telegram') {
      await sendTelegramMessage({
        userId: ownerId,
        text: `<b>Task Completed</b>\n${task.instruction.slice(0, 180)}\n\n${reportMarkdown.slice(0, 1200)}`,
      })
    }
  } catch (err: any) {
    const isCancel = err?.message === 'CANCELLED_BY_USER' || abortController.signal.aborted
    const classified = classifyAIError(err)
    const safeMsg = isCancel ? 'Task cancelled cleanly during worker execution.' : classified.message

    if (isCancel) {
      await supabase.from('assistant_jobs').update({ status: 'cancelled', last_error: safeMsg }).eq('id', job.id)
      await supabase
        .from('assistant_tasks')
        .update({
          status: 'cancelled',
          error_code: 'CANCELLED',
          error_message: safeMsg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.task_id)
      return
    }

    if (classified.retryable && job.attempt_count < job.max_attempts) {
      const backoffSec = 15 * Math.pow(2, job.attempt_count - 1)
      const nextRunAt = new Date(Date.now() + backoffSec * 1000).toISOString()
      await supabase
        .from('assistant_jobs')
        .update({ status: 'queued', locked_by: null, next_run_at: nextRunAt, last_error: safeMsg })
        .eq('id', job.id)
      await supabase
        .from('assistant_tasks')
        .update({
          status: 'queued',
          retry_count: job.attempt_count,
          error_code: classified.errorType,
          error_message: `Transient error (${classified.errorType}); retrying in ${backoffSec}s: ${safeMsg}`,
        })
        .eq('id', job.task_id)
      await logWorkerStep(supabase, {
        taskId: job.task_id,
        userId: ownerId,
        level: 'warn',
        message: `Retry ${job.attempt_count}/${job.max_attempts} scheduled in ${backoffSec}s: ${safeMsg}`,
      })
      return
    }

    await supabase.from('assistant_jobs').update({ status: 'failed', last_error: safeMsg }).eq('id', job.id)
    await supabase
      .from('assistant_tasks')
      .update({
        status: 'failed',
        retry_count: job.attempt_count,
        error_code: classified.errorType,
        error_message: safeMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.task_id)

    await logWorkerStep(supabase, {
      taskId: job.task_id,
      userId: ownerId,
      level: 'error',
      message: `Job failed (${classified.errorType}): ${safeMsg}`,
    })
  } finally {
    if (leaseTimer) clearInterval(leaseTimer)
  }
}

async function main() {
  const ownerId = getConfiguredOwnerUserId()
  const supabase = createWorkerSupabase()

  console.log(`[Sovira Worker] Starting persistent worker "${WORKER_ID}" for owner ${ownerId}`)

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[Sovira Worker] Received ${signal}; draining...`)
    await sendHeartbeat(supabase, ownerId, 'draining').catch(() => {})
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  let lastRecoveryAt = 0
  let lastHeartbeatAt = 0

  while (!shuttingDown) {
    try {
      const now = Date.now()
      if (now - lastHeartbeatAt >= HEARTBEAT_MS) {
        await sendHeartbeat(supabase, ownerId, 'online')
        lastHeartbeatAt = now
      }

      if (now - lastRecoveryAt >= 30000) {
        await supabase.rpc('recover_stale_assistant_jobs', { p_owner_id: ownerId })
        lastRecoveryAt = now
      }

      const { data: claimed, error: claimErr } = await supabase.rpc('claim_next_assistant_job', {
        p_worker_id: WORKER_ID,
        p_lease_seconds: LEASE_SECONDS,
        p_owner_id: ownerId,
      })

      if (claimErr) {
        console.error('[Sovira Worker] claim_next_assistant_job error:', claimErr.message)
      } else {
        const job = Array.isArray(claimed) ? claimed[0] : claimed
        if (job) {
          activeJobCount += 1
          await sendHeartbeat(supabase, ownerId, 'online').catch(() => {})
          try {
            await processClaimedJob(supabase, ownerId, job)
          } finally {
            activeJobCount = Math.max(0, activeJobCount - 1)
          }
          continue
        }
      }
    } catch (loopErr: any) {
      console.error('[Sovira Worker] Loop error:', loopErr?.message || loopErr)
    }

    await new Promise((r) => setTimeout(r, POLL_MS))
  }

  await sendHeartbeat(supabase, ownerId, 'offline').catch(() => {})
  console.log('[Sovira Worker] Exited cleanly.')
}

main().catch((err) => {
  console.error('[Sovira Worker] Fatal startup failure:', err)
  process.exit(1)
})
