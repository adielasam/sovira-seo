import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkUsageLimit } from '@/lib/usage'

const MAGIC_HOUR_API = 'https://api.magichour.ai/v1'
const MAGIC_HOUR_KEY = process.env.MAGIC_HOUR_API_KEY || 'mhk_live_i3nniUOy8sYlv5Teu5C1F208T7Gu8V2klrz81kviSCmNl0Gaya8xi3oYpxD711zVEoErvX1GHm4JmAFd'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, jobId, prompt, image_url, aspect_ratio, mode, modelType, duration } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const headers = {
      'Authorization': `Bearer ${MAGIC_HOUR_KEY}`,
      'Content-Type': 'application/json'
    }

    // ─── STATUS CHECK ──────────────────────────────────────────────
    if (action === 'status') {
      if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

      // jobId format: "type:id" e.g. "text-to-video:abc123" or "ai-image-generator:abc123"
      const [jobType, projectId] = jobId.split(':')
      
      const statusEndpoint = jobType === 'ai-image-generator' ? `/image-projects/${projectId}` : `/video-projects/${projectId}`
      const res = await fetch(`${MAGIC_HOUR_API}${statusEndpoint}`, { headers })
      const data = await res.json()

      if (!res.ok) {
        return NextResponse.json({ error: data.message || 'Failed to get status' }, { status: res.status })
      }

      // Map Magic Hour status to standard format
      const statusMap: Record<string, string> = {
        queued: 'pending',
        in_progress: 'processing',
        processing: 'processing',
        complete: 'completed',
        failed: 'failed',
        error: 'failed',
      }

      return NextResponse.json({
        status: statusMap[data.status] || data.status,
        video_url: data.download?.url || data.downloads?.[0]?.url || null,
        error: data.error || null,
        raw: data
      })
    }

    // ─── CREATE JOB ───────────────────────────────────────────────
    if (action === 'create') {
      if (!prompt && !image_url) {
        return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 })
      }

      // Limit Check
      const { limitReached, maxLimit } = await checkUsageLimit(user.id, 'video')
      if (limitReached) {
        return NextResponse.json({ error: `You have reached your AI Video limit (${maxLimit} per month). Please upgrade your plan.` }, { status: 403 })
      }

      // Boost user prompt with cinematic quality keywords for best output
      const enhancePrompt = (userPrompt: string) => {
        const quality = 'Ultra-realistic photorealistic quality, cinematic 4K, professional film production, dramatic lighting, shallow depth of field, film grain, hyper-detailed textures, award-winning cinematography, Hollywood-grade visual effects.'
        const negative = 'No cartoon style, no anime, no low-resolution, no blurry output, no childish visuals, no CGI artifacts, no watermark.'
        return `${userPrompt.trim()}. ${quality} ${negative}`
      }

      const endSeconds = Number(duration) || 5
      let endpoint = ''
      let payload: Record<string, unknown> = {}

      if (mode === 'image-to-video' && image_url) {
        // Image-to-Video
        endpoint = '/image-to-video'
        payload = {
          name: `Sovira Video - ${new Date().toISOString()}`,
          end_seconds: endSeconds,
          assets: { image_file_path: image_url },
          style: { prompt: enhancePrompt(prompt || 'Animate this image with smooth, cinematic camera movement') },
          aspect_ratio: aspect_ratio || '16:9',
        }
      } else if (mode === 'text-to-image') {
        // ── TEXT-TO-IMAGE via Bynara Image API ────────────────────────
        const NARA_API_KEY = process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs'

        const bynaraRes = await fetch('https://api-images.bynara.id/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NARA_API_KEY}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: enhancePrompt(prompt || ''),
            n: 1,
            size: aspect_ratio === '9:16' ? '1024x1792' : aspect_ratio === '1:1' ? '1024x1024' : '1792x1024',
            response_format: 'url'
          })
        })

        const bynaraData = await bynaraRes.json()

        if (!bynaraRes.ok) {
          return NextResponse.json({ error: bynaraData.error?.message || 'Image generation failed' }, { status: bynaraRes.status })
        }

        const imageUrl = bynaraData.data?.[0]?.url
        if (!imageUrl) {
          return NextResponse.json({ error: 'No image URL returned from image generation service' }, { status: 500 })
        }

        // Log AI usage
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Video Generated', // reuse existing usage key
          details: { endpoint: 'text-to-image', aspect_ratio }
        }])

        // Return immediately — no polling needed, Bynara returns URL synchronously
        return NextResponse.json({
          id: null,
          status: 'completed',
          image_url: imageUrl,
          source: 'bynara'
        })

      } else {
        // Text-to-Video (default)
        endpoint = '/text-to-video'
        payload = {
          name: `Sovira Video - ${new Date().toISOString()}`,
          end_seconds: endSeconds,
          style: { prompt: enhancePrompt(prompt || '') },
          aspect_ratio: aspect_ratio || '16:9',
        }
      }

      const res = await fetch(`${MAGIC_HOUR_API}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        return NextResponse.json({ error: data.message || 'Failed to create video job' }, { status: res.status })
      }

      const projectId = data.id
      if (!projectId) {
        return NextResponse.json({ error: 'No job ID returned from Magic Hour' }, { status: 500 })
      }

      // Compose job id with type prefix for polling
      const composedJobId = `${endpoint.slice(1)}:${projectId}`

      // Log AI usage
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: 'Video Generated', // MUST match checkUsageLimit exact string
        details: { endpoint, aspect_ratio, end_seconds: endSeconds }
      }])

      // Log Activity as Notification
      await supabase.from('notifications').insert([{
        user_id: user.id,
        title: 'AI Video Job Started',
        message: `Your AI Video generation job has started processing.`,
        type: 'info',
        is_global: false,
        is_read: false
      }])

      return NextResponse.json({ id: composedJobId, projectId, credits_charged: data.credits_charged })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Magic Hour Video Error:', error)
    return NextResponse.json({ error: error.message || 'Video generation failed' }, { status: 500 })
  }
}
