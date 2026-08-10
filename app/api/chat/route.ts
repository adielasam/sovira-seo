import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { messages, slug } = await req.json()

    if (!messages || !slug) {
      return NextResponse.json({ error: 'Messages and slug are required' }, { status: 400 })
    }

    const supabaseAdmin = await createAdminClient()

    // If the user is testing in the Live Preview editor, bypass the site lookup
    const isPreview = slug === 'sovira' || slug === 'html-host' || slug === 'www' || slug === 'preview'
    
    let ownerId = null
    let isFree = false
    let isAdmin = false

    if (!isPreview) {
      // 1. Find the site owner
      const { data: siteFiles } = await supabaseAdmin
        .from('content_generations')
        .select('user_id')
        .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
        .like('topic', `${slug}|%`)
        .limit(1)

      if (!siteFiles || siteFiles.length === 0) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }

      ownerId = siteFiles[0].user_id
    }

    if (!isPreview && ownerId) {
      // 2. Check the owner's plan
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('plan')
        .eq('id', ownerId)
        .single()

      const plan = profile?.plan || 'free'
      isFree = plan === 'free' || plan === 'free trial'
      
      // Admins bypass
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerId)
      isAdmin = userData?.user?.email === 'adielasam2015@gmail.com'

      // 3. Enforce Rate Limit for Free Sites
      if (isFree && !isAdmin) {
        const startOfDay = new Date()
        startOfDay.setUTCHours(0, 0, 0, 0)
        
        const { count } = await supabaseAdmin
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', ownerId)
          .eq('action', `Site Chat: ${slug}`)
          .gte('created_at', startOfDay.toISOString())

        const usageCount = count || 0
        
        if (usageCount >= 10) { // Limit free sites to 10 chats per day
          return NextResponse.json({ 
            error: 'This site has reached its daily free chat limit. The owner must upgrade to a paid plan.' 
          }, { status: 429 })
        }
      }
    }

    // 4. Send request to NaraRouter
    const naraKey = process.env.NARA_API_KEY
    if (!naraKey) {
      return NextResponse.json({ error: 'NARA_API_KEY is not configured' }, { status: 500 })
    }

    // Prepend a system prompt to make it act like an educational Claude/GPT
    const systemPrompt = {
      role: 'system',
      content: 'You are an educational AI assistant designed to help humanize text, write code, and answer questions clearly and safely. Do not generate images or videos.'
    }

    const res = await fetch('https://router.bynara.id/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${naraKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Default fast model via NaraRouter
        messages: [systemPrompt, ...messages],
        max_tokens: 800,
        temperature: 0.7
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('NaraRouter Error:', errorText)
      return NextResponse.json({ error: 'Upstream AI provider error' }, { status: 502 })
    }

    const data = await res.json()

    // 5. Log the usage (only if it's a real published site)
    if (!isPreview && ownerId) {
      await supabaseAdmin
        .from('activity_logs')
        .insert([{
          user_id: ownerId,
          action: `Site Chat: ${slug}`,
          details: { model: 'gpt-4o-mini', source: 'instantsite_widget' }
        }])
    }

    return NextResponse.json({ reply: data.choices[0].message.content })
    
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
