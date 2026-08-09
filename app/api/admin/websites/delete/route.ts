import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { currentSlug } = await req.json()
    if (!currentSlug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const supabaseAdmin = createAdminClient()

    // Delete all files for this slug
    const { error } = await supabaseAdmin
      .from('content_generations')
      .delete()
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${currentSlug}|%`)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
