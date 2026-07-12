import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { type, topic, keywords, niche, format } = await req.json()
    
    if (!type || !topic) {
      return NextResponse.json({ error: 'Type and topic are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let systemPrompt = ''
    let prompt = ''

    if (type === 'description') {
      systemPrompt = 'You are a master YouTube SEO expert. Generate a highly optimized, engaging YouTube video description. Include a catchy intro, a 2-paragraph summary incorporating the keywords naturally, a bulleted list of timestamps (chapters), and placeholders for social links. Format using markdown.'
      prompt = `Generate a YouTube description for a video about: "${topic}".
      Target keywords: ${keywords || 'none provided'}.
      Niche: ${niche || 'General'}`
    } else if (type === 'script') {
      systemPrompt = `You are a viral YouTube scriptwriter. Generate a high-retention video script/storyboard. 
      IN ADDITION, ALWAYS START BY PROVIDING 3 HIGHLY CLICKABLE TITLES FOR THIS SCRIPT.
      
      Format using markdown. Include a strong hook for the first 10 seconds, an intro, the main body separated by visual cues, and a strong Call to Action (CTA) at the end.
      
      If the Script Format is 'Dialogue-based', YOU MUST INCLUDE:
      - Character actions
      - Image or character descriptions
      - Camera directions
      - Background music cues

      IMPORTANT CHARACTER CONSISTENCY RULES:
      When characters named Sarah or Sandra are involved, STRICTLY adhere to these descriptions. Do NOT just say "Sarah, the tall girl". Use at least 5 significant features:
      Sarah: A tall, slim Black teenage girl with deep brown skin, long black braided hair tied in a ponytail, wearing a pink hoodie, blue denim jeans, bright pink sneakers, and a silver bracelet. Sarah always has the same face, hairstyle, height, body proportions, clothing, shoes, and accessories. Never alter her appearance.
      Sandra: A fair-skinned teenage girl with shoulder-length straight blonde hair, green eyes, wearing a light blue dress, white cardigan, and white sneakers. Sandra always maintains the same facial features, hairstyle, clothing, body proportions, and accessories. Never redesign or modify her appearance.

      For Google Veo 3 / Image-to-Video generation, add this EXACT text at the beginning of EVERY scene prompt/visual cue:
      "Use the uploaded reference image as the identity reference for Sarah and Sandra. Preserve their exact faces, hairstyles, clothing, shoes, body proportions, height, and skin tones. Do not reinterpret or redesign either character."
      
      And add this EXACT Negative Prompt to every visual cue:
      "Negative Prompt: No identity drift, no face changes, no hairstyle changes, no clothing changes, no body changes, no skin tone changes, no morphing, no flickering, no temporal inconsistency, no duplicate characters, no extra limbs, no anatomy errors."`
      
      prompt = `Generate 3 titles AND a YouTube script/story outline about: "${topic}".
      Target keywords: ${keywords || 'none provided'}.
      Niche: ${niche || 'General'}
      Script Format: ${format || 'Standard'}`
    } else if (type === 'title') {
      systemPrompt = 'You are a YouTube CTR optimization expert. Generate 5 highly clickable, SEO-optimized YouTube video titles. Do not use clickbait, but make them irresistible. Output as a bulleted list.'
      prompt = `Generate 5 YouTube titles for a video about: "${topic}".
      Target keywords: ${keywords || 'none provided'}.
      Niche: ${niche || 'General'}`
    } else if (type === 'tags') {
      systemPrompt = 'You are a YouTube SEO expert. Generate a comma-separated list of the top 20-30 high-volume, low-competition tags (keywords) for the given topic. Output ONLY the tags separated by commas.'
      prompt = `Generate YouTube tags for a video about: "${topic}". Target keywords: ${keywords || 'none provided'}.`
    } else {
      return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 })
    }

    const NARA_API_KEY = process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs'
    
    const response = await fetch(`https://router.bynara.id/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NARA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-large',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nara API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content

    if (!text) throw new Error('No content returned from Nara')

    // Log the AI usage
    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: `YouTube ${type.toUpperCase()} Generated`,
      details: { topic }
    }])

    return NextResponse.json({ result: text.trim() })
  } catch (error: any) {
    console.error('Generate YouTube Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
