import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { isEncryptionConfigured, redactSecretsInText } from '@/lib/assistant/crypto'
import {
  getIntegrationStatusList,
  saveIntegrationConfig,
} from '@/lib/assistant/integrations/vault'
import { INTEGRATION_PROVIDERS } from '@/lib/assistant/types'

const updateIntegrationSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS),
  credentials: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
  disconnect: z.boolean().optional(),
})

export async function GET() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const integrations = await getIntegrationStatusList(auth.userId)
    return NextResponse.json({
      integrations,
      encryptionKeyConfigured: isEncryptionConfigured(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to load integration statuses') },
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

    const rawBody = await req.json().catch(() => null)
    const parsed = updateIntegrationSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid integration payload', issues: parsed.error.issues },
        { status: 400 }
      )
    }

    await saveIntegrationConfig({
      userId: auth.userId,
      provider: parsed.data.provider,
      credentials: parsed.data.credentials,
      enabled: parsed.data.enabled,
      disconnect: parsed.data.disconnect,
    })

    const integrations = await getIntegrationStatusList(auth.userId)
    return NextResponse.json({
      success: true,
      integrations,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to save integration configuration') },
      { status: 400 }
    )
  }
}
