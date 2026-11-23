import { redactSecretsInText } from '../crypto'
import { resolveProviderCredentials } from './vault'

const NOTION_VERSION = '2022-06-28'

export interface NotionSyncResult {
  synced: boolean
  skipped: boolean
  pageId?: string
  pageUrl?: string
  warning?: string
}

export async function syncTaskToNotion(opts: {
  userId: string
  title: string
  status: string
  category: string
  summary?: string
  resultUrl?: string
  pageId?: string
  abortSignal?: AbortSignal
}): Promise<NotionSyncResult> {
  try {
    const resolved = await resolveProviderCredentials(opts.userId, 'notion')
    if (!resolved.enabled) {
      return { synced: false, skipped: true, warning: 'Notion integration is disabled.' }
    }

    const apiKey = resolved.credentials.apiKey
    const databaseId = resolved.credentials.databaseId
    if (!apiKey || (!databaseId && !opts.pageId)) {
      return {
        synced: false,
        skipped: true,
        warning: 'Notion API Key or Database ID is not configured yet; task record kept in Sovira DB.',
      }
    }

    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: opts.title.slice(0, 180) } }],
      },
    }

    if (opts.resultUrl) {
      properties.URL = { url: opts.resultUrl }
    }

    if (opts.pageId) {
      const patchRes = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(opts.pageId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
        signal: opts.abortSignal || AbortSignal.timeout(12000),
      })

      if (!patchRes.ok) {
        const text = await patchRes.text().catch(() => '')
        return {
          synced: false,
          skipped: false,
          warning: `Notion update failed gracefully (HTTP ${patchRes.status}): ${redactSecretsInText(text).slice(0, 200)}`,
        }
      }

      const data = await patchRes.json()
      return {
        synced: true,
        skipped: false,
        pageId: data.id,
        pageUrl: data.url,
      }
    }

    const children = opts.summary
      ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: `[${opts.category} | ${opts.status}]\n${opts.summary}`.slice(0, 1900) } }],
            },
          },
        ]
      : []

    const createRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
        children,
      }),
      signal: opts.abortSignal || AbortSignal.timeout(12000),
    })

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '')
      return {
        synced: false,
        skipped: false,
        warning: `Notion create failed gracefully (HTTP ${createRes.status}): ${redactSecretsInText(text).slice(0, 200)}`,
      }
    }

    const data = await createRes.json()
    return {
      synced: true,
      skipped: false,
      pageId: data.id,
      pageUrl: data.url,
    }
  } catch (err: any) {
    return {
      synced: false,
      skipped: false,
      warning: `Notion temporary API failure handled gracefully: ${redactSecretsInText(err?.message || 'Unknown error')}`,
    }
  }
}
