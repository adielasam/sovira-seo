import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAssistantRateLimit, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { createPlannedTask, listTasks } from '@/lib/assistant/orchestrator'

export const maxDuration = 60

const chatPostSchema = z.object({
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

export async function GET() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const admin = createAdminClient()
    const [{ data: conversations }, tasks] = await Promise.all([
      admin
        .from('assistant_conversations')
        .select('*')
        .eq('user_id', auth.userId)
        .order('updated_at', { ascending: false })
        .limit(20),
      listTasks({ userId: auth.userId, limit: 30 }),
    ])

    return NextResponse.json({
      conversations: conversations || [],
      tasks,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to load assistant workspace') },
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

    const rl = checkAssistantRateLimit(`chat:${auth.userId}`, 25, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = chatPostSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid instruction payload', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    let conversationId = parsed.data.conversationId || null
    let existingMessages: Array<Record<string, unknown>> = []

    if (conversationId) {
      const { data: conv } = await admin
        .from('assistant_conversations')
        .select('id, messages')
        .eq('id', conversationId)
        .eq('user_id', auth.userId)
        .maybeSingle()

      if (conv) {
        existingMessages = Array.isArray(conv.messages) ? conv.messages : []
      } else {
        conversationId = null
      }
    }

    if (!conversationId) {
      const { data: newConv, error: convErr } = await admin
        .from('assistant_conversations')
        .insert({
          user_id: auth.userId,
          title: parsed.data.instruction.slice(0, 80),
          messages: [],
        })
        .select('*')
        .single()

      if (convErr || !newConv) {
        throw new Error(convErr?.message || 'Failed to create conversation')
      }
      conversationId = newConv.id
    }

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: parsed.data.instruction,
      attachments: parsed.data.attachments || [],
      createdAt: new Date().toISOString(),
    }

    const planned = await createPlannedTask({
      userId: auth.userId,
      instruction: parsed.data.instruction,
      conversationId,
      idempotencyKey: parsed.data.idempotencyKey,
      source: 'web',
      attachments: parsed.data.attachments,
    })

    const assistantMsg = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      taskId: planned.task.id,
      content:
        planned.task.status === 'failed'
          ? `Planning encountered an error: ${planned.task.error_message || 'Unable to create task plan.'}`
          : `Proposed execution plan ready (${planned.steps.length} step${planned.steps.length === 1 ? '' : 's'}): ${planned.task.plan?.summary || ''}`,
      createdAt: new Date().toISOString(),
    }

    const updatedMessages = [...existingMessages, userMsg, assistantMsg]
    await admin
      .from('assistant_conversations')
      .update({ messages: updatedMessages })
      .eq('id', conversationId)
      .eq('user_id', auth.userId)

    return NextResponse.json({
      conversationId,
      task: planned.task,
      steps: planned.steps,
      deduplicated: planned.deduplicated,
      messages: updatedMessages,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Internal assistant error') },
      { status: 500 }
    )
  }
}
