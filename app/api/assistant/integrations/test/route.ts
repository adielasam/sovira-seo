import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAssistantRateLimit, requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { testIntegrationConnection } from '@/lib/assistant/integrations/vault'
import { INTEGRATION_PROVIDERS } from '@/lib/assistant/types'

const testSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS),
})

export async function POST(req: Request) {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rl = checkAssistantRateLimit(`int_test:${auth.userId}`, 20, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = testSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid integration provider' }, { status: 400 })
    }

    const result = await testIntegrationConnection(auth.userId, parsed.data.provider)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Connection test failed') },
      { status: 500 }
    )
  }
}
