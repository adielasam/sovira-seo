import { NextResponse } from 'next/server'
import { requireAssistantOwner } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { fetchLiveBrowserFrame } from '@/lib/assistant/live-browser-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireAssistantOwner()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { buffer, contentType } = await fetchLiveBrowserFrame(auth.userId)
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Failed to capture live browser frame') },
      { status: 502 }
    )
  }
}
