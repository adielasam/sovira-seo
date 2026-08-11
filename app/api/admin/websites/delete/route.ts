import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { currentSlug } = await req.json()
    if (!currentSlug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const supabaseAdmin = createAdminClient()

    // 1. Fetch file paths to delete from storage bucket
    const { data: files } = await supabaseAdmin
      .from('content_generations')
      .select('file_path')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${currentSlug}|%`)

    const filePaths = files?.map(f => f.file_path).filter(Boolean) as string[]

    if (filePaths && filePaths.length > 0) {
      // Supabase storage remove takes an array of paths
      await supabaseAdmin.storage.from('sovira_storage').remove(filePaths)
    }

    // 2. Delete all rows for this slug from the database
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
