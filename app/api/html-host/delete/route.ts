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

    // Delete all records in content_generations where tone is INSTANT_SITE or INSTANT_SITE_BINARY and topic starts with slug|
    const { error } = await supabaseAdmin
      .from('content_generations')
      .delete()
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${slug}|%`)

    if (error) {
      console.error('Error deleting site:', error)
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
    }

    // Also delete any associated media in the blog-images bucket
    try {
      const { data: mediaFiles, error: listError } = await supabaseAdmin.storage
        .from('blog-images')
        .list(`instantsite_media/${slug}`)
      
      if (!listError && mediaFiles && mediaFiles.length > 0) {
        const filesToRemove = mediaFiles.map(file => `instantsite_media/${slug}/${file.name}`)
        await supabaseAdmin.storage
          .from('blog-images')
          .remove(filesToRemove)
      }
    } catch (mediaError) {
      console.error('Failed to clean up media files (non-fatal):', mediaError)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
