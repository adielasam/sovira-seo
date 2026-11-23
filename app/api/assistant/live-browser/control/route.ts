import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isValidUuid, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { getLiveBrowserState, setLiveBrowserControl } from '@/lib/assistant/live-browser-client'
import { appendTaskLog } from '@/lib/assistant/orchestrator'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const controlSchema = z.object({
  action: z.enum(['takeover', 'release']),
  reason: z.string().max(300).optional(),
  taskId: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = controlSchema.parse(await req.json())
    const controlResult = await setLiveBrowserControl(auth.userId, body.action, body.reason)

    let targetTaskId = body.taskId && isValidUuid(body.taskId) ? body.taskId : null
    if (!targetTaskId) {
      const liveState = await getLiveBrowserState(auth.userId).catch(() => null)
      const activeTaskId = liveState?.state?.activeRun?.taskId
      if (activeTaskId && isValidUuid(activeTaskId)) {
        targetTaskId = activeTaskId
      }
    }

    if (targetTaskId) {
      const admin = createAdminClient()
      const nextStatus = body.action === 'takeover' ? 'waiting_human_verification' : 'running'
      await admin
        .from('assistant_tasks')
        .update({ status: nextStatus })
        .eq('id', targetTaskId)
        .eq('user_id', auth.userId)
        .in('status', ['running', 'waiting_human_verification', 'queued'])

      await appendTaskLog({
        taskId: targetTaskId,
        userId: auth.userId,
        level: 'security',
        message:
          body.action === 'takeover'
            ? `Owner took manual control of the live browser${body.reason ? `: ${body.reason}` : '.'}`
            : 'Owner clicked Done — handed browser control back to agent.',
      }).catch(() => {})
    }

    return NextResponse.json({
      ...controlResult,
      taskId: targetTaskId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to update browser control mode') },
      { status: 400 }
    )
  }
}
