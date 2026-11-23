import { NextResponse } from 'next/server'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import {
  createTelegramLinkingToken,
  getTelegramLinkStatus,
  unlinkTelegramAccount,
} from '@/lib/assistant/integrations/telegram'

export async function GET() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const status = await getTelegramLinkStatus(auth.userId)
    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to read Telegram link status') },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const token = await createTelegramLinkingToken(auth.userId)
    return NextResponse.json({
      success: true,
      code: token.code,
      expiresAt: token.expiresAt,
      instruction: `Send /link ${token.code} directly from your authorised Telegram account within 5 minutes.`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to generate Telegram link token') },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await unlinkTelegramAccount(auth.userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to unlink Telegram') },
      { status: 500 }
    )
  }
}
