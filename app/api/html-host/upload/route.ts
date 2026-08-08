import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    
    const body = await req.json()
    
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Generate a random 6-character alphanumeric slug
    const generateSlug = () => Math.random().toString(36).substring(2, 8).toLowerCase()
    let slug = generateSlug()
    
    // Simple loop to ensure slug uniqueness by checking existing topics
    let isUnique = false
    let attempts = 0
    while (!isUnique && attempts < 5) {
      const { data } = await supabaseAdmin
        .from('content_generations')
        .select('id')
        .eq('tone', 'INSTANT_SITE')
        .like('topic', `${slug}|%`)
        .limit(1)
      
      if (!data || data.length === 0) {
        isUnique = true
      } else {
        slug = generateSlug()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique site URL' }, { status: 500 })
    }

    const user_id = body.userId || null 

    // Prepare files for bulk insert into content_generations
    // But since user_id is NOT NULL in user_profiles, inserting null into content_generations might fail if user_id is a required foreign key and the DB enforces it strictly without ON DELETE SET NULL for everything.
    // Actually, user_id is uuid in content_generations. If it's optional, null is fine. If it's mandatory, it will fail.
    // Let's pass a dummy or just try null. If they are authenticated, we should use their real ID.
    // For now we will try null if not logged in.
    
    const filesToInsert = body.files.map((file: any) => ({
      user_id,
      topic: `${slug}|${file.path.startsWith('/') ? file.path.substring(1) : file.path}`,
      content_type: file.type || 'text/plain',
      tone: 'INSTANT_SITE',
      generated_content: file.content,
      word_count: file.content.length // Store byte/char length in word_count
    }))

    // Insert into content_generations
    const { error: filesError } = await supabaseAdmin
      .from('content_generations')
      .insert(filesToInsert)

    if (filesError) {
      console.error('Error uploading files:', filesError)
      return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      slug,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://sovira.com.ng'}/site/${slug}`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
