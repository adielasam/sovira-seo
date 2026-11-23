import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { sendLiveBrowserInput } from '@/lib/assistant/live-browser-client'

export const dynamic = 'force-dynamic'

const inputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('click'),
    x: z.number().min(0).max(1280),
    y: z.number().min(0).max(800),
    button: z.enum(['left', 'right', 'middle']).optional(),
    clickCount: z.number().int().min(1).max(3).optional(),
  }),
  z.object({
    type: z.literal('wheel'),
    deltaX: z.number().min(-2000).max(2000).default(0),
    deltaY: z.number().min(-2000).max(2000),
  }),
  z.object({
    type: z.literal('type'),
    text: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal('key'),
    key: z.string().min(1).max(40),
  }),
  z.object({
    type: z.literal('navigate'),
    url: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'Only http/https URLs allowed'),
  }),
  z.object({ type: z.literal('back') }),
  z.object({ type: z.literal('forward') }),
  z.object({ type: z.literal('reload') }),
  z.object({
    type: z.literal('new_tab'),
    url: z
      .string()
      .url()
      .refine((u) => /^https?:\/\//i.test(u), 'Only http/https URLs allowed')
      .optional(),
  }),
  z.object({
    type: z.literal('switch_tab'),
    index: z.number().int().min(0).max(50),
  }),
  z.object({
    type: z.literal('close_tab'),
    index: z.number().int().min(0).max(50).optional(),
  }),
])

export async function POST(req: Request) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const parsed = inputSchema.parse(await req.json())
    const result = await sendLiveBrowserInput(auth.userId, parsed as unknown as Record<string, unknown>)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to send browser input') },
      { status: 400 }
    )
  }
}
