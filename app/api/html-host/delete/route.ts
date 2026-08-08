import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function DELETE(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    
    if (!slug) {
      return NextResponse.json({ error: 'No slug provided' }, { status: 400 })
    }

    // Delete all records in content_generations where tone is INSTANT_SITE and topic starts with slug|
    const { error } = await supabaseAdmin
      .from('content_generations')
      .delete()
      .eq('tone', 'INSTANT_SITE')
      .like('topic', `${slug}|%`)

    if (error) {
      console.error('Error deleting site:', error)
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
