import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('voice') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Fish Audio API key is not configured' }, { status: 500 })
    }

    // Forward the file to Fish Audio to create a model
    const fishFormData = new FormData()
    fishFormData.append('type', 'tts')
    fishFormData.append('title', `Cloned Voice - ${Date.now()}`)
    fishFormData.append('visibility', 'private')
    fishFormData.append('voices', file)

    const response = await fetch('https://api.fish.audio/model', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: fishFormData,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Fish API Model Error:', errText)
      throw new Error(`Failed to create voice clone (Status ${response.status})`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      voice_id: data._id,
      message: 'Voice cloned successfully'
    })

  } catch (error: any) {
    console.error('Voice Cloning Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to clone voice' }, { status: 500 })
  }
}
