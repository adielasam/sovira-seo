import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

      // jobId format: "type:id" e.g. "text-to-video:abc123"
      const [jobType, projectId] = jobId.split(':')
      
      const res = await fetch(`${MAGIC_HOUR_API}/video-projects/${projectId}`, { headers })
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
          style: { prompt: prompt || 'Animate this image cinematically' },
          aspect_ratio: aspect_ratio || '16:9',
        }
      } else {
        // Text-to-Video (default)
        endpoint = '/text-to-video'
        payload = {
          name: `Sovira Video - ${new Date().toISOString()}`,
          end_seconds: endSeconds,
          style: { prompt: prompt || '' },
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
        action: 'AI Video Job Started (Magic Hour)',
        details: { endpoint, aspect_ratio, end_seconds: endSeconds }
      }])

      return NextResponse.json({ id: composedJobId, projectId, credits_charged: data.credits_charged })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Magic Hour Video Error:', error)
    return NextResponse.json({ error: error.message || 'Video generation failed' }, { status: 500 })
  }
}
