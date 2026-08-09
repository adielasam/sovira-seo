import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { oldSlug, newSlug } = await req.json()
    
    if (!oldSlug || !newSlug) {
      return NextResponse.json({ error: 'Missing slugs' }, { status: 400 })
    }

    // Only allow alphanumeric and hyphens in the new slug
    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      return NextResponse.json({ error: 'Invalid URL format. Use only lowercase letters, numbers, and hyphens.' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Check if newSlug is already taken
    const { data: existing } = await supabaseAdmin
      .from('content_generations')
      .select('id')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${newSlug}|%`)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'URL is already taken! Choose a different name.' }, { status: 409 })
    }

    // Fetch all files for oldSlug
    const { data: files, error: fetchError } = await supabaseAdmin
      .from('content_generations')
      .select('id, topic')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${oldSlug}|%`)

    if (fetchError || !files || files.length === 0) {
      return NextResponse.json({ error: 'Original site not found' }, { status: 404 })
    }

    // Update each file's topic
    for (const file of files) {
      const newTopic = file.topic.replace(`${oldSlug}|`, `${newSlug}|`)
      await supabaseAdmin
        .from('content_generations')
        .update({ topic: newTopic })
        .eq('id', file.id)
    }

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('origin') || 'http://localhost:3000')
    const finalUrl = hostUrl.includes('localhost') 
      ? `${hostUrl}/${newSlug}/` 
      : `https://${newSlug}.sovira.com.ng/`

    return NextResponse.json({ url: finalUrl, slug: newSlug })
  } catch (error) {
    console.error('Rename error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
