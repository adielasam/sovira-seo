import { NextResponse } from 'next/server'
import { checkAssistantRateLimit } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import {
  authenticateMcpOrOwnerRequest,
  getChatGptAppsOpenApiSpec,
  handleMcpJsonRpcRequest,
  SOVIRA_MCP_TOOLS,
} from '@/lib/assistant/mcp-adapter'

export const maxDuration = 60

export async function GET(req: Request) {
  try {
    const auth = await authenticateMcpOrOwnerRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.sovira.com.ng'

    if (format === 'openapi') {
      return NextResponse.json(getChatGptAppsOpenApiSpec(appUrl))
    }

    return NextResponse.json({
      server: 'sovira-ai-task-assistant',
      protocolVersion: '2024-11-05',
      authMode: auth.mode,
      tools: SOVIRA_MCP_TOOLS,
      endpoints: {
        mcpJsonRpc: `${appUrl}/api/assistant/mcp`,
        openApiSchema: `${appUrl}/api/assistant/mcp?format=openapi`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'MCP status error') },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticateMcpOrOwnerRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const rl = checkAssistantRateLimit(`mcp:${auth.userId}`, 40, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: expected JSON payload' } },
        { status: 400 }
      )
    }

    const rpcResponse = await handleMcpJsonRpcRequest(auth.userId, body)
    return NextResponse.json(rpcResponse)
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: redactSecretsInText(error?.message || 'Internal MCP server error') },
      },
      { status: 500 }
    )
  }
}
