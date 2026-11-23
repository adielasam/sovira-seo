import { z } from 'zod'
import {
  constantTimeEqual,
  getConfiguredOwnerUserId,
  isValidUuid,
  requireAssistantOwner,
} from './auth'
import { redactSecretsInText } from './crypto'
import { getIntegrationStatusList, resolveProviderCredentials } from './integrations/vault'
import {
  approveTask,
  cancelTask,
  createPlannedTask,
  getTaskDetail,
  listTasks,
  retryTask,
} from './orchestrator'

export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const SOVIRA_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'sovira_plan_and_run_task',
    description:
      'Plans an instruction into structured Sovira tasks. Optionally executes automatically ONLY when all steps are low-risk ai_research_analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        instruction: { type: 'string', minLength: 2, description: 'Task instruction to plan or execute' },
        autoApproveLowRisk: {
          type: 'boolean',
          default: false,
          description: 'If true and plan is strictly low-risk ai_research_analysis, runs immediately.',
        },
        idempotencyKey: { type: 'string', description: 'Optional idempotency key for duplicate protection' },
      },
      required: ['instruction'],
      additionalProperties: false,
    },
  },
  {
    name: 'sovira_list_tasks',
    description: 'Lists recent Sovira AI Task Assistant tasks and their durable statuses.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional filter: all, waiting_approval, queued, running, completed, failed' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 15 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'sovira_get_task',
    description: 'Retrieves full task details, step breakdown, logs, and results by task UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Canonical task UUID' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
  },
  {
    name: 'sovira_approve_task',
    description: 'Approves a pending task plan and dispatches it for execution.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Canonical task UUID' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
  },
  {
    name: 'sovira_cancel_task',
    description: 'Cancels an active or waiting task cleanly.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Canonical task UUID' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
  },
  {
    name: 'sovira_retry_task',
    description: 'Retries an eligible failed or cancelled task within retry limits.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Canonical task UUID' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
  },
]

export async function authenticateMcpOrOwnerRequest(req: Request): Promise<
  | { authorized: true; userId: string; mode: 'session' | 'mcp_bearer' }
  | { authorized: false; status: 401 | 403; error: string }
> {
  const authHeader = req.headers.get('authorization') || ''
  const customHeader = req.headers.get('x-sovira-mcp-token') || ''
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : customHeader.trim()

  if (bearerToken) {
    const ownerId = getConfiguredOwnerUserId()
    let expected = process.env.ASSISTANT_MCP_BEARER_TOKEN || ''
    if (!expected) {
      const resolved = await resolveProviderCredentials(ownerId, 'chatgpt_mcp').catch(() => ({
        enabled: true,
        credentials: {} as Record<string, string>,
      }))
      if (resolved.enabled) {
        expected = resolved.credentials.bearerToken || ''
      }
    }

    if (!expected || !constantTimeEqual(bearerToken, expected.trim())) {
      return {
        authorized: false,
        status: 401,
        error: 'Invalid or unconfigured MCP bearer token.',
      }
    }

    return { authorized: true, userId: ownerId, mode: 'mcp_bearer' }
  }

  const sessionAuth = await requireAssistantOwner()
  if (!sessionAuth.authorized) {
    return sessionAuth
  }
  return { authorized: true, userId: sessionAuth.userId, mode: 'session' }
}

const mcpEnvelopeSchema = z.object({
  jsonrpc: z.literal('2.0').default('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
})

function mcpError(id: string | number | null | undefined, code: number, message: string) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message: redactSecretsInText(message) },
  }
}

function mcpSuccess(id: string | number | null | undefined, result: unknown) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    result,
  }
}

export async function handleMcpJsonRpcRequest(
  userId: string,
  rawBody: unknown
): Promise<Record<string, unknown>> {
  const parsed = mcpEnvelopeSchema.safeParse(rawBody)
  if (!parsed.success) {
    return mcpError(null, -32600, 'Invalid JSON-RPC 2.0 request envelope')
  }

  const { id, method, params = {} } = parsed.data

  switch (method) {
    case 'initialize':
      return mcpSuccess(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
        },
        serverInfo: {
          name: 'sovira-ai-task-assistant',
          version: '1.0.0',
        },
      })

    case 'notifications/initialized':
    case 'ping':
      return mcpSuccess(id, {})

    case 'tools/list':
      return mcpSuccess(id, { tools: SOVIRA_MCP_TOOLS })

    case 'resources/list':
      return mcpSuccess(id, {
        resources: [
          {
            uri: 'sovira://tasks/recent',
            name: 'Recent Sovira Tasks',
            description: 'Latest durable tasks created by the owner across Web, Telegram, and MCP.',
            mimeType: 'application/json',
          },
          {
            uri: 'sovira://integrations/core',
            name: 'Sovira Integrations Status',
            description: 'Non-secret health status for Core and Optional Sovira integrations.',
            mimeType: 'application/json',
          },
        ],
      })

    case 'resources/read': {
      const uri = typeof params.uri === 'string' ? params.uri : ''
      if (uri === 'sovira://tasks/recent') {
        const tasks = await listTasks({ userId, limit: 20 })
        return mcpSuccess(id, {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(tasks, null, 2) }],
        })
      }
      if (uri === 'sovira://integrations/core') {
        const integrations = await getIntegrationStatusList(userId)
        return mcpSuccess(id, {
          contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(integrations, null, 2) }],
        })
      }
      return mcpError(id, -32602, `Unknown resource URI: ${uri}`)
    }

    case 'tools/call': {
      const toolName = typeof params.name === 'string' ? params.name : ''
      const args = (params.arguments && typeof params.arguments === 'object'
        ? params.arguments
        : {}) as Record<string, unknown>

      try {
        if (toolName === 'sovira_plan_and_run_task') {
          const instruction = typeof args.instruction === 'string' ? args.instruction.trim() : ''
          if (instruction.length < 2) {
            return mcpError(id, -32602, 'instruction must be at least 2 characters')
          }

          const planned = await createPlannedTask({
            userId,
            instruction,
            idempotencyKey: typeof args.idempotencyKey === 'string' ? args.idempotencyKey : undefined,
            source: 'mcp',
          })

          const isPureLowRiskResearch =
            planned.task.status === 'waiting_approval' &&
            planned.task.plan?.riskLevel === 'low' &&
            planned.steps.length > 0 &&
            planned.steps.every((s) => s.tool_name === 'ai_research_analysis')

          let finalTask = planned.task
          let steps = planned.steps
          if (args.autoApproveLowRisk === true && isPureLowRiskResearch) {
            const approved = await approveTask({ userId, taskId: planned.task.id })
            finalTask = approved.task
            const detail = await getTaskDetail(userId, finalTask.id)
            if (detail) steps = detail.steps
          }

          const payload = { task: finalTask, steps, deduplicated: planned.deduplicated }
          return mcpSuccess(id, {
            content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
            structuredContent: payload,
          })
        }

        if (toolName === 'sovira_list_tasks') {
          const tasks = await listTasks({
            userId,
            status: typeof args.status === 'string' ? args.status : undefined,
            limit: typeof args.limit === 'number' ? args.limit : 15,
          })
          return mcpSuccess(id, {
            content: [{ type: 'text', text: JSON.stringify({ tasks }, null, 2) }],
            structuredContent: { tasks },
          })
        }

        if (toolName === 'sovira_get_task') {
          const taskId = typeof args.taskId === 'string' ? args.taskId : ''
          if (!isValidUuid(taskId)) return mcpError(id, -32602, 'Valid taskId UUID is required')
          const detail = await getTaskDetail(userId, taskId)
          if (!detail) return mcpError(id, -32004, 'Task not found')
          return mcpSuccess(id, {
            content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }],
            structuredContent: detail,
          })
        }

        if (toolName === 'sovira_approve_task') {
          const taskId = typeof args.taskId === 'string' ? args.taskId : ''
          if (!isValidUuid(taskId)) return mcpError(id, -32602, 'Valid taskId UUID is required')
          const res = await approveTask({ userId, taskId })
          return mcpSuccess(id, {
            content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
            structuredContent: res,
          })
        }

        if (toolName === 'sovira_cancel_task') {
          const taskId = typeof args.taskId === 'string' ? args.taskId : ''
          if (!isValidUuid(taskId)) return mcpError(id, -32602, 'Valid taskId UUID is required')
          const task = await cancelTask({ userId, taskId })
          return mcpSuccess(id, {
            content: [{ type: 'text', text: JSON.stringify({ task }, null, 2) }],
            structuredContent: { task },
          })
        }

        if (toolName === 'sovira_retry_task') {
          const taskId = typeof args.taskId === 'string' ? args.taskId : ''
          if (!isValidUuid(taskId)) return mcpError(id, -32602, 'Valid taskId UUID is required')
          const task = await retryTask({ userId, taskId })
          return mcpSuccess(id, {
            content: [{ type: 'text', text: JSON.stringify({ task }, null, 2) }],
            structuredContent: { task },
          })
        }

        return mcpError(id, -32601, `Unknown MCP tool: ${toolName}`)
      } catch (err: any) {
        return mcpError(id, -32000, err?.message || 'Tool execution failed')
      }
    }

    default:
      return mcpError(id, -32601, `Unsupported MCP method: ${method}`)
  }
}

export function getChatGptAppsOpenApiSpec(appUrl: string) {
  const base = appUrl.replace(/\/+$/, '')
  return {
    openapi: '3.1.0',
    info: {
      title: 'Sovira AI Task Assistant — Shared ChatGPT Apps SDK & MCP API',
      version: '1.0.0',
      description:
        'Private single-user API for planning, approving, inspecting, and managing durable Sovira tasks via ChatGPT Apps SDK / Actions or MCP.',
    },
    servers: [{ url: base }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/assistant/mcp': {
        post: {
          operationId: 'invokeSoviraMcp',
          summary: 'Execute an MCP JSON-RPC 2.0 request (initialize, tools/list, tools/call, resources/read)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jsonrpc: { type: 'string', enum: ['2.0'] },
                    id: { type: ['string', 'integer'] },
                    method: { type: 'string' },
                    params: { type: 'object' },
                  },
                  required: ['jsonrpc', 'method'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'MCP JSON-RPC 2.0 response payload' },
          },
        },
      },
      '/api/assistant/tasks': {
        get: {
          operationId: 'listSoviraTasks',
          summary: 'List recent Sovira tasks',
          responses: { '200': { description: 'Array of owner task records' } },
        },
        post: {
          operationId: 'createSoviraTask',
          summary: 'Plan a new Sovira task (paused at waiting_approval until approved)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instruction: { type: 'string' },
                    idempotencyKey: { type: 'string' },
                  },
                  required: ['instruction'],
                },
              },
            },
          },
          responses: { '200': { description: 'Created task with proposed plan steps' } },
        },
      },
      '/api/assistant/tasks/{id}/approve': {
        post: {
          operationId: 'approveSoviraTask',
          summary: 'Approve and execute or enqueue a planned task',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated task execution result or queue status' } },
        },
      },
      '/api/assistant/tasks/{id}/cancel': {
        post: {
          operationId: 'cancelSoviraTask',
          summary: 'Cancel an active or waiting task',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated task status' } },
        },
      },
    },
  }
}
