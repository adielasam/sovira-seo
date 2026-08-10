import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const slug = formData.get('slug') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Default to 'temp_session' if slug is missing so users can still upload before saving
    const folderSlug = slug && slug !== 'html-host' && slug !== 'sovira' ? slug : `temp_${Date.now()}`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
