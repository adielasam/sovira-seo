import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function DELETE(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const supabase = await createClient() // For auth context
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    
    if (!slug) {
      return NextResponse.json({ error: 'No slug provided' }, { status: 400 })
    }

    // 1. Authenticate the request
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    // 2. Fetch the site to check ownership
    const { data: siteFiles } = await supabaseAdmin
      .from('content_generations')
      .select('user_id')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .like('topic', `${slug}|%`)
      .limit(1)

    if (!siteFiles || siteFiles.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const ownerId = siteFiles[0].user_id
    const isAdmin = currentUser?.email === 'adielasam2015@gmail.com'

    // Prevent unauthorized deletion (Maximum Security)
    if (ownerId !== currentUser?.id && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. You do not have permission to delete this site.' }, { status: 403 })
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
