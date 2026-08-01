import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { checkUsageLimit } from '@/lib/usage'

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { data: trackedData } = await req.json()
    
    if (!trackedData || !Array.isArray(trackedData)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('user_profiles').select('plan').eq('id', user.id).single()
    const plan = profile?.plan || 'free'
    
    if (!['pro', 'agency'].includes(plan)) {
       // Allow limited insight generation on starter/free? 
       // The prompt says "use Groq to generate a 2-3 sentence... to control API usage"
       // I'll gate it to pro/agency, or maybe free gets 1 per month via usage tracking. 
       // Let's just allow it for all but record usage.
       const { limitReached } = await checkUsageLimit(user.id, 'insight')
       if (limitReached) {
         return NextResponse.json({ error: 'You have reached your Free plan usage limit.' }, { status: 403 })
       }
    }

    // Prepare data for the prompt
    const summaryData = trackedData.map(kw => ({
      keyword: kw.keyword,
      rank: kw.currentRank || 'Not top 100',
      change: kw.change
    }))

    const promptText = `Analyze this SEO rank tracking data for a user's dashboard. 
Data: ${JSON.stringify(summaryData)}

Provide a concise, 2-3 sentence plain-English summary of their ranking trends. 
Point out any major wins or areas needing attention. Use a professional, encouraging SaaS tone. 
Do not use markdown formatting. Do not hallucinate data.`

    const { text } = await generateText({
      // @ts-ignore
      model: groq('llama-3.3-70b-versatile'),
      system: 'You are an expert SEO analyst.',
      prompt: promptText
    })

    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'Generated Rank Insight',
      details: { keywordsAnalyzed: trackedData.length }
    }])

    return NextResponse.json({ success: true, insight: text.trim() })
  } catch (error: any) {
    console.error('Insight Generation Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate insight' }, { status: 500 })
  }
}
