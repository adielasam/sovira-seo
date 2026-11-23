import { NextResponse } from 'next/server'
import { checkAssistantRateLimit, isValidUuid, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { approveTask, getTaskDetail } from '@/lib/assistant/orchestrator'

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

    const rl = checkAssistantRateLimit(`approve:${auth.userId}`, 20, 60_000)
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

    const result = await approveTask({ userId: auth.userId, taskId: id })
    const detail = await getTaskDetail(auth.userId, id)

    return NextResponse.json({
      ...result,
      steps: detail?.steps || [],
      logs: detail?.logs || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to approve task') },
      { status: 500 }
    )
  }
}
