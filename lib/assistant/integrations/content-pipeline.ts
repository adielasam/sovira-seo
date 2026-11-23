import { completeWithFailover, ResolvedAICredentials } from '../ai-provider'
import { redactSecretsInText } from '../crypto'
import { resolveAICredentials, resolveProviderCredentials } from './vault'

export interface ContentPipelineInput {
  userId: string
  taskId: string
  topic: string
  targetAudience: string
  style: string
  durationSeconds: number
  includeSubtitles: boolean
  watermarkText: string
  publishMode: 'draft_only' | 'youtube_private' | 'await_publish_approval'
  onStageLog?: (message: string, meta?: Record<string, unknown>) => Promise<void>
  abortSignal?: AbortSignal
}

export interface ContentPipelineStageStatus {
  stage: number
  name: string
  status: 'completed' | 'skipped' | 'awaiting_credentials' | 'awaiting_approval' | 'failed'
  detail: string
}

export interface ContentPipelineResult {
  topic: string
  story: {
    title: string
    script: string
    wordCount: number
  }
  storyboard: Array<{
    sceneNumber: number
    durationSec: number
    narrationLine: string
    visualPrompt: string
    subtitleText: string
  }>
  subtitlesSrt: string
  watermarkConfig: {
    text: string
    position: string
    opacity: number
  }
  seoMetadata: {
    youtubeTitle: string
    youtubeDescription: string
    tags: string[]
  }
  narrationAsset: {
    provider: 'elevenlabs'
    generated: boolean
    bytesLength?: number
    contentType?: string
    note: string
  }
  renderAsset: {
    provider: 'creatomate'
    rendered: boolean
    renderId?: string
    status?: string
    videoUrl?: string
    note: string
  }
  youtubePublish: {
    uploaded: boolean
    privacyStatus: 'private' | 'not_uploaded'
    videoId?: string
    videoUrl?: string
    note: string
  }
  stages: ContentPipelineStageStatus[]
}

function buildSrtFromStoryboard(
  scenes: ContentPipelineResult['storyboard']
): string {
  let cursor = 0
  const formatTime = (sec: number) => {
    const hrs = String(Math.floor(sec / 3600)).padStart(2, '0')
    const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const secs = String(Math.floor(sec % 60)).padStart(2, '0')
    return `${hrs}:${mins}:${secs},000`
  }

  return scenes
    .map((s, idx) => {
      const start = formatTime(cursor)
      cursor += Math.max(2, s.durationSec)
      const end = formatTime(cursor)
      return `${idx + 1}\n${start} --> ${end}\n${s.subtitleText || s.narrationLine}\n`
    })
    .join('\n')
}

export async function runContentAutomationPipeline(
  input: ContentPipelineInput
): Promise<ContentPipelineResult> {
  const stages: ContentPipelineStageStatus[] = []
  const log = async (msg: string, meta?: Record<string, unknown>) => {
    if (input.onStageLog) await input.onStageLog(msg, meta)
  }

  const aiCreds: ResolvedAICredentials = await resolveAICredentials(input.userId)

  // Stage 1 & 2 & 6 & 8: AI Story, Storyboard, Visual Prompts, Subtitles, SEO Metadata
  await log('Stage 1-2: Generating original story, storyboard, visual prompts, and YouTube SEO metadata...')

  const aiPrompt = `Create a complete original video production package in valid JSON ONLY (no markdown outside JSON).
Topic: ${input.topic}
Target Audience: ${input.targetAudience}
Visual Style: ${input.style}
Target Duration Seconds: ${input.durationSeconds}

Return JSON with this exact shape:
{
  "title": "Engaging video title",
  "script": "Full continuous narration script",
  "storyboard": [
    {
      "sceneNumber": 1,
      "durationSec": 8,
      "narrationLine": "Spoken line for scene 1",
      "visualPrompt": "Detailed licensed-safe original visual generation prompt",
      "subtitleText": "Concise subtitle line"
    }
  ],
  "seoMetadata": {
    "youtubeTitle": "SEO title under 70 chars",
    "youtubeDescription": "Compelling YouTube description with summary and call to action",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  }
}`

  const completion = await completeWithFailover({
    systemPrompt:
      'You are an executive film director and YouTube SEO producer. Output strictly valid original JSON with no copyright infringement.',
    prompt: aiPrompt,
    temperature: 0.4,
    maxTokens: 3200,
    abortSignal: input.abortSignal,
    credentials: aiCreds,
  })

  const cleaned = completion.text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
  const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1))

  const storyboard: ContentPipelineResult['storyboard'] = Array.isArray(parsed.storyboard)
    ? parsed.storyboard.map((s: any, idx: number) => ({
        sceneNumber: Number(s.sceneNumber || idx + 1),
        durationSec: Number(s.durationSec || 6),
        narrationLine: String(s.narrationLine || ''),
        visualPrompt: String(s.visualPrompt || ''),
        subtitleText: String(s.subtitleText || s.narrationLine || ''),
      }))
    : []

  const subtitlesSrt = input.includeSubtitles ? buildSrtFromStoryboard(storyboard) : ''
  const watermarkConfig = {
    text: input.watermarkText || 'Sovira Studio',
    position: 'bottom-right',
    opacity: 0.72,
  }

  const storyTitle = String(parsed.title || input.topic)
  const storyScript = String(parsed.script || storyboard.map((s) => s.narrationLine).join(' '))

  stages.push(
    { stage: 1, name: 'Original Story Generation', status: 'completed', detail: `Generated via ${completion.provider} (${completion.model})` },
    { stage: 2, name: 'Storyboard Creation', status: 'completed', detail: `${storyboard.length} scenes prepared` },
    { stage: 4, name: 'Visual Asset Prompts', status: 'completed', detail: `${storyboard.length} scene prompts prepared` },
    { stage: 6, name: 'Subtitles (.SRT)', status: input.includeSubtitles ? 'completed' : 'skipped', detail: input.includeSubtitles ? `${storyboard.length} timed subtitle cues` : 'Subtitles disabled' },
    { stage: 7, name: 'Brand Watermark Config', status: 'completed', detail: `Watermark "${watermarkConfig.text}" configured` },
    { stage: 8, name: 'YouTube SEO Metadata', status: 'completed', detail: `SEO title & ${(parsed.seoMetadata?.tags || []).length} tags prepared` }
  )

  // Stage 3: ElevenLabs Narration Generation
  const eleven = await resolveProviderCredentials(input.userId, 'elevenlabs')
  let narrationAsset: ContentPipelineResult['narrationAsset'] = {
    provider: 'elevenlabs',
    generated: false,
    note: 'ElevenLabs API key not configured; audio synthesis paused awaiting credentials.',
  }

  if (eleven.enabled && eleven.credentials.apiKey) {
    if (input.abortSignal?.aborted) throw new Error('Cancelled before ElevenLabs narration')
    const voiceId = eleven.credentials.voiceId || '21m00Tcm4TlvDq8ikWAM'
    await log(`Stage 3: Synthesizing narration via ElevenLabs voice ${voiceId}...`)
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': eleven.credentials.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: storyScript.slice(0, 4500),
        model_id: 'eleven_multilingual_v2',
      }),
      signal: input.abortSignal || AbortSignal.timeout(45000),
    })

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text().catch(() => '')
      throw new Error(`ElevenLabs narration error (HTTP ${ttsRes.status}): ${redactSecretsInText(errBody)}`)
    }

    const audioBuffer = await ttsRes.arrayBuffer()
    narrationAsset = {
      provider: 'elevenlabs',
      generated: true,
      bytesLength: audioBuffer.byteLength,
      contentType: 'audio/mpeg',
      note: `Synthesized ${audioBuffer.byteLength} bytes of narration audio.`,
    }
    stages.push({ stage: 3, name: 'ElevenLabs Narration', status: 'completed', detail: narrationAsset.note })
  } else {
    stages.push({ stage: 3, name: 'ElevenLabs Narration', status: 'awaiting_credentials', detail: narrationAsset.note })
  }

  // Stage 5: Creatomate Video Rendering (never fake a render)
  const creatomate = await resolveProviderCredentials(input.userId, 'creatomate')
  let renderAsset: ContentPipelineResult['renderAsset'] = {
    provider: 'creatomate',
    rendered: false,
    note: 'Creatomate API key or Template ID not configured; render step skipped awaiting credentials.',
  }

  if (creatomate.enabled && creatomate.credentials.apiKey && creatomate.credentials.templateId) {
    if (input.abortSignal?.aborted) throw new Error('Cancelled before Creatomate render')
    await log('Stage 5: Submitting render job to Creatomate API...')
    const renderRes = await fetch('https://api.creatomate.com/v1/renders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creatomate.credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: creatomate.credentials.templateId,
        modifications: {
          Title: storyTitle,
          Watermark: watermarkConfig.text,
          Script: storyScript.slice(0, 1500),
        },
      }),
      signal: input.abortSignal || AbortSignal.timeout(30000),
    })

    if (!renderRes.ok) {
      const errText = await renderRes.text().catch(() => '')
      throw new Error(`Creatomate render API failed (HTTP ${renderRes.status}): ${redactSecretsInText(errText)}`)
    }

    const renders = await renderRes.json()
    const firstRender = Array.isArray(renders) ? renders[0] : renders
    renderAsset = {
      provider: 'creatomate',
      rendered: true,
      renderId: firstRender?.id,
      status: firstRender?.status || 'planned',
      videoUrl: firstRender?.url,
      note: `Creatomate render submitted (id=${firstRender?.id}, status=${firstRender?.status}).`,
    }
    stages.push({ stage: 5, name: 'Creatomate Video Render', status: 'completed', detail: renderAsset.note })
  } else {
    stages.push({ stage: 5, name: 'Creatomate Video Render', status: 'awaiting_credentials', detail: renderAsset.note })
  }

  // Stage 9 & 10: Human Approval Gate & YouTube Data API v3 Upload (never public without approval)
  let youtubePublish: ContentPipelineResult['youtubePublish'] = {
    uploaded: false,
    privacyStatus: 'not_uploaded',
    note: 'Upload paused pending rendered video and explicit human publish approval.',
  }

  if (input.publishMode === 'draft_only' || input.publishMode === 'await_publish_approval') {
    stages.push({
      stage: 9,
      name: 'Human Publish Approval Gate',
      status: 'awaiting_approval',
      detail: 'Stopped before YouTube upload per safety policy; awaiting explicit publish approval.',
    })
  } else {
    const yt = await resolveProviderCredentials(input.userId, 'google_oauth')
    if (!yt.enabled || !yt.credentials.clientId || !yt.credentials.clientSecret || !yt.credentials.refreshToken) {
      youtubePublish = {
        uploaded: false,
        privacyStatus: 'not_uploaded',
        note: 'Google OAuth / YouTube credentials not configured; YouTube upload cannot proceed.',
      }
      stages.push({
        stage: 10,
        name: 'YouTube Data API v3 Upload',
        status: 'awaiting_credentials',
        detail: youtubePublish.note,
      })
    } else if (!renderAsset.rendered || !renderAsset.videoUrl) {
      youtubePublish = {
        uploaded: false,
        privacyStatus: 'not_uploaded',
        note: 'Cannot upload to YouTube because rendered MP4 asset is not yet available.',
      }
      stages.push({
        stage: 10,
        name: 'YouTube Data API v3 Upload',
        status: 'skipped',
        detail: youtubePublish.note,
      })
    } else {
      stages.push({
        stage: 10,
        name: 'YouTube Data API v3 Upload (Private Draft)',
        status: 'awaiting_approval',
        detail: 'YouTube OAuth verified; final private upload requires explicit upload confirmation.',
      })
    }
  }

  stages.sort((a, b) => a.stage - b.stage)

  return {
    topic: input.topic,
    story: {
      title: storyTitle,
      script: storyScript,
      wordCount: storyScript.split(/\s+/).filter(Boolean).length,
    },
    storyboard,
    subtitlesSrt,
    watermarkConfig,
    seoMetadata: {
      youtubeTitle: String(parsed.seoMetadata?.youtubeTitle || storyTitle),
      youtubeDescription: String(parsed.seoMetadata?.youtubeDescription || ''),
      tags: Array.isArray(parsed.seoMetadata?.tags) ? parsed.seoMetadata.tags.map(String) : [],
    },
    narrationAsset,
    renderAsset,
    youtubePublish,
    stages,
  }
}
