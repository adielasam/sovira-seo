import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text, reference_id, emotion } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Fish Audio API key is not configured' }, { status: 500 })
    }

    // Fish Audio TTS Payload
    const payload: any = {
      text: text,
      format: 'mp3',
      normalize: true,
      mp3_bitrate: 128
    }

    // If user provided a specific voice ID, use it. Otherwise, zero-shot without reference_id
    if (reference_id) {
      payload.reference_id = reference_id
    }

    // Use Fish Audio's endpoint
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': 's2.1-pro' // User specifically requested S2.1 Pro
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Fish API Error:', errText)
      throw new Error(`Failed to generate audio (Status ${response.status})`)
    }

    // Read the MP3 binary buffer
    const audioBuffer = await response.arrayBuffer()
    const finalBuffer = Buffer.from(audioBuffer)

    // Return as base64 JSON string to avoid Vercel edge corruption
    return NextResponse.json({
      audioBase64: finalBuffer.toString('base64')
    })

  } catch (error: any) {
    console.error('Fish Audio Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate podcast audio' }, { status: 500 })
  }
}
