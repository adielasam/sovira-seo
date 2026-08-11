import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { currentSlug, isPaused } = await req.json()
    if (!currentSlug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const supabaseAdmin = createAdminClient()

    // Fetch all files for this slug
    const { data: files } = await supabaseAdmin
      .from('content_generations')
      .select('id, topic')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${currentSlug}|%`)

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const baseSlug = isPaused ? currentSlug.replace('_paused_', '') : currentSlug
    const newSlug = isPaused ? baseSlug : `_paused_${baseSlug}`

    // Update each file's topic
    for (const file of files) {
      const newTopic = file.topic.replace(`${currentSlug}|`, `${newSlug}|`)
      await supabaseAdmin
        .from('content_generations')
        .update({ topic: newTopic })
        .eq('id', file.id)
    }

    return NextResponse.json({ success: true, newSlug })
  } catch (error) {
    console.error('Toggle error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
