import { NextResponse } from 'next/server'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { getLiveBrowserState } from '@/lib/assistant/live-browser-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const result = await getLiveBrowserState(auth.userId)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to read live browser state') },
      { status: 500 }
    )
  }
}
