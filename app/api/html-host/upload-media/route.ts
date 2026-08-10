import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const slug = formData.get('slug') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Auth Context
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData?.user

    // If uploading to a specific slug, verify ownership (Maximum Security)
    if (slug && slug !== 'html-host' && slug !== 'sovira') {
      const { data: siteFiles } = await supabaseAdmin
        .from('content_generations')
        .select('user_id')
        .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
        .like('topic', `${slug}|%`)
        .limit(1)

      if (siteFiles && siteFiles.length > 0) {
        const ownerId = siteFiles[0].user_id
        const isAdmin = currentUser?.email === 'adielasam2015@gmail.com'
        
        if (ownerId !== currentUser?.id && !isAdmin) {
          return NextResponse.json({ error: 'Unauthorized to upload media to this site' }, { status: 403 })
        }
      }
    }

    // Default to 'temp_session' if slug is missing so users can still upload before saving
    const folderSlug = slug && slug !== 'html-host' && slug !== 'sovira' ? slug : `temp_${Date.now()}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Sanitize filename to prevent weird characters in URL
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
    const filePath = `instantsite_media/${folderSlug}/${Date.now()}_${safeName}`

    const { data, error } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg'
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrlData.publicUrl, slug: folderSlug })

  } catch (error: any) {
    console.error('Media Upload Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
