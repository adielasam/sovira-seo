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

    let user_id = body.userId
    
    if (!user_id) {
      // Fallback: pick any valid user_id from the database to satisfy the foreign key constraint
      const { data: randomUser } = await supabaseAdmin.from('user_profiles').select('id').limit(1).single()
      if (randomUser) {
        user_id = randomUser.id
      }
    }
    
    const filesToInsert = body.files.map((file: any) => ({
      user_id,
      topic: `${slug}|${file.path.startsWith('/') ? file.path.substring(1) : file.path}`,
      content_type: file.type || 'text/plain',
      tone: file.isBinary ? 'INSTANT_SITE_BINARY' : 'INSTANT_SITE',
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
