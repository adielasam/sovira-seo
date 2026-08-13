import { NextResponse } from 'next/server'

// ElevenLabs Voice ID mappings for the premium US/UK voices
const ELEVENLABS_VOICES: Record<string, string> = {
  adam: 'pNInz6obpgDQGcFmaJcg',
  rachel: '21m00Tcm4TlvDq8ikWAM',
  antoni: 'ErXwobaYiN019PkySvjV',
}

// Azure Neural Voice ID mappings for native Nigerian voices
const AZURE_VOICES: Record<string, string> = {
  chidi: 'en-NG-EzinneNeural', // Map to Ezinne for female, Abeo for male
  ezinne: 'en-NG-EzinneNeural',
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

    // Determine Provider
    const isAzure = Object.keys(AZURE_VOICES).includes(voiceId)
    
    if (isAzure) {
      // Azure TTS Implementation
      const azureKey = process.env.AZURE_SPEECH_KEY
      const azureRegion = process.env.AZURE_SPEECH_REGION || 'eastus'

      if (!azureKey) {
        return NextResponse.json({ 
          error: 'Azure Speech Key is missing. Please add AZURE_SPEECH_KEY to your environment variables to use Nigerian premium voices.' 
        }, { status: 400 })
      }

      const azureVoice = AZURE_VOICES[voiceId]
      const ssml = `<speak version='1.0' xml:lang='en-NG'><voice xml:lang='en-NG' xml:gender='Female' name='${azureVoice}'>${script}</voice></speak>`

      const response = await fetch(`https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'SoviraSEO'
        },
        body: ssml
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Azure TTS Error: ${errText}`)
      }

      const audioBuffer = await response.arrayBuffer()
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      })

    } else {
      // ElevenLabs TTS Implementation
      const elevenLabsKey = process.env.ELEVENLABS_API_KEY
      
      if (!elevenLabsKey) {
        return NextResponse.json({ 
          error: 'ElevenLabs API Key is missing. Please add ELEVENLABS_API_KEY to your environment variables to use US premium voices.' 
        }, { status: 400 })
      }

      const actualVoiceId = ELEVENLABS_VOICES[voiceId] || ELEVENLABS_VOICES.adam

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${actualVoiceId}?optimize_streaming_latency=0&output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      })

      if (!response.ok) {
        const errJson = await response.json()
        throw new Error(`ElevenLabs Error: ${errJson.detail?.message || errJson.detail || 'Unknown'}`)
      }

      const audioBuffer = await response.arrayBuffer()
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.byteLength.toString(),
        },
      })
    }

  } catch (error: any) {
    console.error('TTS Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
