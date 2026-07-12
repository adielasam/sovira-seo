import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, jobId, prompt, image_url, aspect_ratio } = body

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.SHORTAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'SHORTAPI_KEY is not configured in Vercel' }, { status: 500 })
    }

    // Action: Check Status
    if (action === 'status') {
      if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
      
      const res = await fetch(`https://api.shortapi.ai/api/v1/job/status?id=${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `ShortAPI error: ${err}` }, { status: res.status })
      }
      
      const data = await res.json()
      return NextResponse.json(data)
    }

    // Action: Create Job
    if (action === 'create') {
      if (!prompt && !image_url) {
        return NextResponse.json({ error: 'Prompt or image_url is required' }, { status: 400 })
      }

      // Default model mapping (Veo 3 or Kling depending on the user request)
      const model = 'google/veo-3.1/generate'

      const payload = {
        model,
        args: {
          prompt: prompt || '',
          image_url: image_url || '',
          aspect_ratio: aspect_ratio || '16:9'
        }
      }

      const res = await fetch('https://api.shortapi.ai/api/v1/job/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `ShortAPI error: ${err}` }, { status: res.status })
      }

      const data = await res.json()

      // Log the AI usage
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: `AI Video Job Started`,
        details: { model, aspect_ratio }
      }])

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Generate Video Error:', error)
    return NextResponse.json({ error: error.message || 'Video generation failed' }, { status: 500 })
  }
}
