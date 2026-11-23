import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAssistantRateLimit, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { createPlannedTask, listTasks } from '@/lib/assistant/orchestrator'

export const maxDuration = 60

const createTaskSchema = z.object({
  instruction: z.string().min(2).max(6000),
  conversationId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().min(4).max(120).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        type: z.string().max(100).optional(),
        size: z.number().int().min(0).optional(),
        summary: z.string().max(4000).optional(),
      })
    )
    .max(5)
    .optional(),
})

export async function GET(req: Request) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = Number(searchParams.get('limit') || 40)

    const tasks = await listTasks({ userId: auth.userId, status, limit })
    return NextResponse.json({ tasks })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to fetch tasks') },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rl = checkAssistantRateLimit(`tasks_create:${auth.userId}`, 25, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = createTaskSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid task request', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const created = await createPlannedTask({
      userId: auth.userId,
      instruction: parsed.data.instruction,
      conversationId: parsed.data.conversationId,
      idempotencyKey: parsed.data.idempotencyKey,
      source: 'web',
      attachments: parsed.data.attachments,
    })

    return NextResponse.json(created)
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to create task') },
      { status: 500 }
    )
  }
}
