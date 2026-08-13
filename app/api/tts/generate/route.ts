import { NextResponse } from 'next/server'
import * as googleTTS from 'google-tts-api'

export async function POST(req: Request) {
  try {
    const { script, voiceId } = await req.json()

    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }

    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 })
    }

    // Since budget is $0, we map the voices to free Google Translate TTS locales
    let lang = 'en-US'
    if (voiceId === 'chidi' || voiceId === 'ezinne') {
      lang = 'en-ZA' // Fallback for African accent since en-NG isn't supported by the free API
    } else if (voiceId === 'rachel') {
      lang = 'en-GB' // UK accent for variety
    }

    // Get array of base64 audio chunks for scripts longer than 200 chars
    const base64Chunks = await googleTTS.getAllAudioBase64(script, {
      lang,
      slow: false,
      host: 'https://translate.google.com',
    })

    // Decode base64 chunks and concatenate them into a single Buffer
    const buffers = base64Chunks.map(chunk => Buffer.from(chunk.base64, 'base64'))
    const finalBuffer = Buffer.concat(buffers)

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': finalBuffer.byteLength.toString(),
      },
    })

  } catch (error: any) {
    console.error('TTS Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate free audio' }, { status: 500 })
  }
}
