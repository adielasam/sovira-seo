import { NextResponse } from 'next/server'
import { isValidUuid, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { getTaskDetail, rejectTask } from '@/lib/assistant/orchestrator'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid task UUID' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 500) : undefined

    const task = await rejectTask({ userId: auth.userId, taskId: id, reason })
    const detail = await getTaskDetail(auth.userId, id)

    return NextResponse.json({
      task,
      steps: detail?.steps || [],
      logs: detail?.logs || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to reject task') },
      { status: 400 }
    )
  }
}
