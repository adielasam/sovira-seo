import { NextResponse } from 'next/server'
import { checkAssistantRateLimit, isValidUuid, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { getTaskDetail, retryTask } from '@/lib/assistant/orchestrator'

export const maxDuration = 60

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rl = checkAssistantRateLimit(`retry:${auth.userId}`, 15, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const { id } = await params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid task UUID' }, { status: 400 })
    }

    const task = await retryTask({ userId: auth.userId, taskId: id })
    const detail = await getTaskDetail(auth.userId, id)

    return NextResponse.json({
      task,
      steps: detail?.steps || [],
      logs: detail?.logs || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to retry task') },
      { status: 400 }
    )
  }
}
