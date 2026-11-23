import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getConfiguredOwnerUserId, isValidUuid } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import {
  recordWebhookIdempotency,
  verifyMakeCallbackRequest,
} from '@/lib/assistant/integrations/make'
import { sendTelegramMessage } from '@/lib/assistant/integrations/telegram'
import { appendTaskLog } from '@/lib/assistant/orchestrator'

export async function POST(req: Request) {
  try {
    const ownerId = getConfiguredOwnerUserId()
    const rawBody = await req.text()

    const verified = await verifyMakeCallbackRequest({
      userId: ownerId,
      rawBody,
      timestampHeader: req.headers.get('x-sovira-timestamp'),
      signatureHeader: req.headers.get('x-sovira-signature'),
      bearerSecretHeader: req.headers.get('x-make-webhook-secret'),
    })

    if (!verified) {
      return NextResponse.json({ error: 'Unauthorized Make.com callback signature' }, { status: 401 })
    }

    const body = JSON.parse(rawBody || '{}')
    const taskId = typeof body.taskId === 'string' ? body.taskId : ''
    const executionId = typeof body.executionId === 'string' ? body.executionId : ''
    const eventKey = typeof body.eventId === 'string' ? body.eventId : `${executionId}:${body.status || 'update'}`

    if (!isValidUuid(taskId)) {
      return NextResponse.json({ error: 'Valid taskId UUID is required' }, { status: 400 })
    }

    const dedup = await recordWebhookIdempotency({
      userId: ownerId,
      provider: 'make',
      eventKey,
      rawPayload: rawBody,
    })

    if (dedup.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    const admin = createAdminClient()
    const { data: task } = await admin
      .from('assistant_tasks')
      .select('id, source, instruction, external_execution_id')
      .eq('id', taskId)
      .eq('user_id', ownerId)
      .maybeSingle()

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const callbackStatus = String(body.status || 'completed').toLowerCase()
    const isCompleted = callbackStatus === 'completed' || callbackStatus === 'success'
    const isFailed = callbackStatus === 'failed' || callbackStatus === 'error'
    const nextTaskStatus = isCompleted ? 'completed' : isFailed ? 'failed' : 'running'

    await admin
      .from('assistant_tasks')
      .update({
        status: nextTaskStatus,
        ...(body.result ? { result: body.result } : {}),
        ...(isFailed && body.error ? { error_message: redactSecretsInText(String(body.error)) } : {}),
        ...(isCompleted || isFailed ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', taskId)
      .eq('user_id', ownerId)

    await admin
      .from('assistant_task_steps')
      .update({
        status: isCompleted ? 'completed' : isFailed ? 'failed' : 'running',
        ...(body.result ? { output: body.result } : {}),
        ...(isCompleted || isFailed ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('task_id', taskId)
      .eq('status', 'waiting_external')

    await admin
      .from('assistant_jobs')
      .update({
        status: isCompleted ? 'completed' : isFailed ? 'failed' : 'running',
      })
      .eq('task_id', taskId)
      .eq('status', 'waiting_external')

    await appendTaskLog({
      taskId,
      userId: ownerId,
      level: isFailed ? 'error' : 'audit',
      message: `Make.com callback received (executionId=${executionId || 'n/a'}, status=${nextTaskStatus}).`,
    })

    if (task.source === 'telegram' && (isCompleted || isFailed)) {
      await sendTelegramMessage({
        userId: ownerId,
        text: `<b>Make.com Workflow ${isCompleted ? 'Completed' : 'Failed'}</b>\nTask: ${task.instruction.slice(0, 140)}`,
      })
    }

    return NextResponse.json({ ok: true, status: nextTaskStatus })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Make.com webhook processing error') },
      { status: 500 }
    )
  }
}
