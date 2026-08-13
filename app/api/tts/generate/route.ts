import { NextResponse } from 'next/server'

// Map our voice IDs to free Amazon Polly voices provided by StreamElements
const STREAM_ELEMENTS_VOICES: Record<string, string> = {
  adam: 'Matthew', // Premium US Male
  rachel: 'Joanna', // Premium US Female
  antoni: 'Justin', // Friendly US Male
  chidi: 'Brian', // UK Male (Fallback for Nigerian)
  ezinne: 'Amy' // UK Female (Fallback for Nigerian)
}

export async function POST(req: Request) {
  try {
    const { script, voiceId } = await req.json()

    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 })
    }

    if (!voiceId) {
      return NextResponse.json({ error: 'Voice ID is required' }, { status: 400 })
    }

    // Fallback to Matthew if voice not found
    const targetVoice = STREAM_ELEMENTS_VOICES[voiceId] || 'Matthew'

    // StreamElements provides free access to Amazon Polly voices
    const response = await fetch(`https://api.streamelements.com/kappa/v2/speech?voice=${targetVoice}&text=${encodeURIComponent(script)}`)

    if (!response.ok) {
      throw new Error(`Failed to generate audio (Status ${response.status})`)
    }

    // Get the raw audio buffer from the response
    const audioBuffer = await response.arrayBuffer()
    const finalBuffer = Buffer.from(audioBuffer)

    // Return as base64 JSON to completely avoid Next.js binary buffer corruption on Vercel
    return NextResponse.json({
      audioBase64: finalBuffer.toString('base64')
    })

  } catch (error: any) {
    console.error('TTS Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate free audio' }, { status: 500 })
  }
}
