import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    // Use the admin client (service role) so anonymous users can insert without RLS blocking them 
    // if they aren't logged in, or we just rely on RLS allowing anonymous inserts. 
    // Actually, createAdminClient is better here to bypass any strict auth rules for anonymous hosting.
    const supabaseAdmin = createAdminClient()
    
    // Parse the JSON body. Expected format:
    // { files: [{ path: string, content: string, type: string }] }
    const body = await req.json()
    
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Generate a random 6-character alphanumeric slug
    const generateSlug = () => Math.random().toString(36).substring(2, 8).toLowerCase()
    let slug = generateSlug()
    
    // Simple loop to ensure slug uniqueness (rare collision)
    let isUnique = false
    let attempts = 0
    while (!isUnique && attempts < 5) {
      const { data } = await supabaseAdmin.from('hosted_sites').select('id').eq('slug', slug).single()
      if (!data) {
        isUnique = true
      } else {
        slug = generateSlug()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique site URL' }, { status: 500 })
    }

    // Extract user if present (optional for anonymous uploads)
    // We can't easily get the user from admin client, so we will extract an optional user_id from the client body if needed, or rely on normal createClient
    // Let's just default to null for anonymous uploads since no signup is required.
    const user_id = body.userId || null 

    // Insert into hosted_sites
    const { data: site, error: siteError } = await supabaseAdmin
      .from('hosted_sites')
      .insert({
        slug,
        user_id
      })
      .select('id')
      .single()

    if (siteError || !site) {
      console.error('Error creating hosted site:', siteError)
      return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
    }

    // Prepare files for bulk insert
    const filesToInsert = body.files.map((file: any) => ({
      site_id: site.id,
      file_path: file.path.startsWith('/') ? file.path.substring(1) : file.path,
      content: file.content,
      content_type: file.type || 'text/plain'
    }))

    // Insert into hosted_files
    const { error: filesError } = await supabaseAdmin
      .from('hosted_files')
      .insert(filesToInsert)

    if (filesError) {
      console.error('Error uploading files:', filesError)
      // Cleanup the site if files failed
      await supabaseAdmin.from('hosted_sites').delete().eq('id', site.id)
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
