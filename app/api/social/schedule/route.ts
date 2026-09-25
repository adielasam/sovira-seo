import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { post, platforms, scheduleDate } = await req.json()

    if (!post || !platforms || platforms.length === 0) {
      return NextResponse.json({ error: 'Post content and platforms are required' }, { status: 400 })
    }

    const ayrshareApiKey = process.env.AYRSHARE_API_KEY
    if (!ayrshareApiKey) {
      return NextResponse.json({ error: 'Ayrshare API key is not configured' }, { status: 500 })
    }

    const payload: any = {
      post: post,
      platforms: platforms,
    }

    if (scheduleDate) {
      // Ayrshare expects ISO 8601 UTC format, e.g., "2026-10-01T12:00:00Z"
      payload.scheduleDate = scheduleDate
    }

    const response = await fetch('https://app.ayrshare.com/api/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ayrshareApiKey}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Ayrshare Error:', data)
      return NextResponse.json({ error: data.message || 'Failed to schedule post via Ayrshare' }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Social Schedule Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
