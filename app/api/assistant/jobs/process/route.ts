import { NextResponse } from 'next/server'
import {
  checkAssistantRateLimit,
  constantTimeEqual,
  getConfiguredOwnerUserId,
  requireAssistantOwner,
} from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { processNextQueuedJob } from '@/lib/assistant/orchestrator'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    let ownerId: string | null = null

    // Allow authenticated owner session OR CRON_SECRET / ASSISTANT_MCP_BEARER_TOKEN bearer auth
    const authHeader = req.headers.get('authorization') || ''
    const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

    if (bearer) {
      const cronSecret = process.env.CRON_SECRET || ''
      const mcpSecret = process.env.ASSISTANT_MCP_BEARER_TOKEN || ''
      const matchesCron = Boolean(cronSecret && constantTimeEqual(bearer, cronSecret))
      const matchesMcp = Boolean(mcpSecret && constantTimeEqual(bearer, mcpSecret))
      if (matchesCron || matchesMcp) {
        ownerId = getConfiguredOwnerUserId()
      } else {
        return NextResponse.json({ error: 'Unauthorized bearer token' }, { status: 401 })
      }
    } else {
      const auth = await requireAssistantOwner()
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
      }
      ownerId = auth.userId
    }

    const rl = checkAssistantRateLimit(`jobs_process:${ownerId}`, 20, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const result = await processNextQueuedJob({ userId: ownerId })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Queue processor error') },
      { status: 500 }
    )
  }
}
