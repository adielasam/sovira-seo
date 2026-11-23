import { NextResponse } from 'next/server'
import { getConfiguredOwnerUserId, isValidUuid } from '@/lib/assistant/auth'
import { redactSecretsInText } from '@/lib/assistant/crypto'
import { recordWebhookIdempotency } from '@/lib/assistant/integrations/make'
import {
  answerTelegramCallbackQuery,
  assertTelegramUserAuthorized,
  isTelegramUserConfiguredAllowed,
  sendTelegramMessage,
  verifyAndBindTelegramLink,
  verifyTelegramWebhookSecret,
} from '@/lib/assistant/integrations/telegram'
import {
  approveTask,
  cancelTask,
  createPlannedTask,
  listTasks,
  rejectTask,
} from '@/lib/assistant/orchestrator'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token')
    const validSecret = await verifyTelegramWebhookSecret(secretHeader)

    if (!validSecret) {
      return NextResponse.json({ error: 'Unauthorized Telegram webhook secret' }, { status: 401 })
    }

    const rawBody = await req.text()
    const update = JSON.parse(rawBody || '{}')
    const ownerId = getConfiguredOwnerUserId()

    if (update?.update_id !== undefined) {
      const dedup = await recordWebhookIdempotency({
        userId: ownerId,
        provider: 'telegram',
        eventKey: `tg_update_${update.update_id}`,
        rawPayload: rawBody,
      })
      if (dedup.duplicate) {
        return NextResponse.json({ ok: true, duplicate: true })
      }
    }

    // 1. Handle Inline Keyboard Callbacks (approve:<id>, reject:<id>, cancel:<id>)
    if (update?.callback_query) {
      const cb = update.callback_query
      const fromId = Number(cb.from?.id)
      const chatId = Number(cb.message?.chat?.id)
      const dataStr = String(cb.data || '')

      const authorized = await assertTelegramUserAuthorized(fromId)
      if (!authorized) {
        await answerTelegramCallbackQuery({
          userId: ownerId,
          callbackQueryId: cb.id,
          text: 'Unauthorized Telegram account.',
        })
        return NextResponse.json({ ok: true, ignored: true })
      }

      const [action, taskId] = dataStr.split(':')
      if (!isValidUuid(taskId)) {
        await answerTelegramCallbackQuery({
          userId: ownerId,
          callbackQueryId: cb.id,
          text: 'Invalid task ID.',
        })
        return NextResponse.json({ ok: true })
      }

      if (action === 'approve') {
        await answerTelegramCallbackQuery({
          userId: ownerId,
          callbackQueryId: cb.id,
          text: 'Task approved. Dispatching...',
        })
        const res = await approveTask({ userId: ownerId, taskId, notifyTelegram: true })
        if (res.workerQueued && chatId) {
          await sendTelegramMessage({
            userId: ownerId,
            chatId,
            text: `<b>Task Queued</b>\nTask ID: <code>${taskId}</code>\nDispatched to background worker.`,
          })
        }
      } else if (action === 'reject') {
        await rejectTask({ userId: ownerId, taskId, reason: 'Rejected via Telegram' })
        await answerTelegramCallbackQuery({
          userId: ownerId,
          callbackQueryId: cb.id,
          text: 'Task rejected.',
        })
        if (chatId) {
          await sendTelegramMessage({
            userId: ownerId,
            chatId,
            text: `Task <code>${taskId}</code> rejected.`,
          })
        }
      } else if (action === 'cancel') {
        await cancelTask({ userId: ownerId, taskId })
        await answerTelegramCallbackQuery({
          userId: ownerId,
          callbackQueryId: cb.id,
          text: 'Cancellation requested.',
        })
        if (chatId) {
          await sendTelegramMessage({
            userId: ownerId,
            chatId,
            text: `Cancellation requested for task <code>${taskId}</code>.`,
          })
        }
      }

      return NextResponse.json({ ok: true })
    }

    // 2. Handle Private Text Messages
    const msg = update?.message
    if (!msg || typeof msg.text !== 'string') {
      return NextResponse.json({ ok: true })
    }

    const fromId = Number(msg.from?.id)
    const chatId = Number(msg.chat?.id)
    const username = msg.from?.username
    const text = msg.text.trim()

    // Ignore non-private chats or non-allowed Telegram user IDs strictly
    if (msg.chat?.type !== 'private') {
      return NextResponse.json({ ok: true, ignored: 'non_private_chat' })
    }

    const allowedUser = await isTelegramUserConfiguredAllowed(fromId)
    if (!allowedUser) {
      return NextResponse.json({ ok: true, ignored: 'unauthorized_user' })
    }

    // Explicit account linking command
    if (text.startsWith('/link ')) {
      const code = text.slice(6).trim()
      const bindRes = await verifyAndBindTelegramLink({
        telegramUserId: fromId,
        telegramChatId: chatId,
        telegramUsername: username,
        code,
      })
      await sendTelegramMessage({
        userId: ownerId,
        chatId,
        text: bindRes.ok
          ? `<b>Linked Successfully</b>\n${bindRes.message}\n\nSend any instruction, or use /status and /tasks.`
          : `<b>Linking Failed</b>\n${bindRes.message}`,
      })
      return NextResponse.json({ ok: true })
    }

    // All operational commands require verified DB binding in addition to TELEGRAM_ALLOWED_USER_ID
    const fullyAuthorized = await assertTelegramUserAuthorized(fromId)
    if (!fullyAuthorized) {
      await sendTelegramMessage({
        userId: ownerId,
        chatId,
        text: 'Account link not verified yet. Generate a 5-minute linking code in Sovira -> AI Task Assistant -> Connected Accounts and send /link <CODE>.',
      })
      return NextResponse.json({ ok: true })
    }

    if (text === '/start' || text === '/help') {
      await sendTelegramMessage({
        userId: ownerId,
        chatId,
        text: `<b>Sovira AI Task Assistant (Verified)</b>\nSend any instruction to plan & approve tasks.\n\nCommands:\n• /tasks — Recent task queue\n• /status — Latest task status`,
      })
      return NextResponse.json({ ok: true })
    }

    if (text === '/tasks' || text === '/status') {
      const recent = await listTasks({ userId: ownerId, limit: 5 })
      const summary =
        recent.length === 0
          ? 'No tasks recorded yet.'
          : recent
              .map(
                (t) =>
                  `• <b>[${t.status.toUpperCase()}]</b> ${t.instruction.slice(0, 70)}\n  ID: <code>${t.id}</code>`
              )
              .join('\n\n')
      await sendTelegramMessage({
        userId: ownerId,
        chatId,
        text: `<b>Recent Sovira Tasks</b>\n\n${summary}`,
      })
      return NextResponse.json({ ok: true })
    }

    // Create a new planned task from natural language instruction
    const planned = await createPlannedTask({
      userId: ownerId,
      instruction: text,
      idempotencyKey: `tg_${msg.chat.id}_${msg.message_id}`,
      source: 'telegram',
    })

    if (planned.task.status === 'failed') {
      await sendTelegramMessage({
        userId: ownerId,
        chatId,
        text: `<b>Planning Failed</b>\n${planned.task.error_message || 'Unable to generate plan.'}`,
      })
      return NextResponse.json({ ok: true })
    }

    const stepsPreview = planned.steps
      .map((s) => `${s.step_order}. <b>${s.title}</b> [${s.tool_name}]`)
      .join('\n')

    await sendTelegramMessage({
      userId: ownerId,
      chatId,
      text: `<b>Proposed Task Plan</b>\n<b>Summary:</b> ${planned.task.plan?.summary || ''}\n\n${stepsPreview}\n\n<i>Approve to begin durable execution:</i>`,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '✅ Approve & Execute', callback_data: `approve:${planned.task.id}` },
            { text: '❌ Reject', callback_data: `reject:${planned.task.id}` },
          ],
          [{ text: '🛑 Cancel', callback_data: `cancel:${planned.task.id}` }],
        ],
      },
    })

    return NextResponse.json({ ok: true, taskId: planned.task.id })
  } catch (error: any) {
    return NextResponse.json(
      { error: redactSecretsInText(error?.message || 'Telegram webhook error') },
      { status: 500 }
    )
  }
}
