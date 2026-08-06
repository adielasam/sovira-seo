import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { prompt, slideCount, audience, ratio } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.BYNARA_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'BYNARA_API_KEY is not configured in the environment variables. Please add it to your .env.local file.' 
      }, { status: 500 })
    }

    const systemPrompt = `You are an expert presentation designer. Create a highly professional and structured presentation outline.
    
REQUIREMENTS:
- Topic/Prompt: ${prompt}
- Slide Count: ${slideCount}
- Target Audience: ${audience || 'General Professional'}

Output STRICTLY in valid JSON format. The JSON should be an array of slide objects.
Each object MUST have these EXACT keys:
- "title": A concise, impactful title for the slide.
- "subtitle": A brief supporting subtitle or summary.
- "points": An array of 3-5 concise bullet points (strings).

Example Output:
[
  {
    "title": "Introduction to AI",
    "subtitle": "The future of automation",
    "points": ["What is AI?", "Brief history", "Why it matters today"]
  }
]

Do not include markdown blocks like \`\`\`json, just output the raw JSON array. Make sure the JSON is perfectly valid.`

    const response = await fetch('https://router.bynara.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'auto/bynara',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bynara API Error:', errorText)
      return NextResponse.json({ error: 'Failed to generate slides from Bynara API' }, { status: 500 })
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || '[]'
    
    // Clean up potential markdown blocks if the model ignored instructions
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim()

    let parsedSlides = []
    try {
      parsedSlides = JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse JSON from AI:', content)
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 })
    }

    return NextResponse.json({ slides: parsedSlides })

  } catch (error) {
    console.error('Slides Generation Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
