import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    
    // Fetch the site
    const { data: siteFiles } = await supabaseAdmin
      .from('content_generations')
      .select('user_id, content')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .eq('topic', `${slug}|index.html`)
      .limit(1)

    if (!siteFiles || siteFiles.length === 0) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const ownerId = siteFiles[0].user_id
    const isAdmin = user.email === 'adielasam2015@gmail.com' || user.email === 'microsoftportharcourt@gmail.com'
    
    // Verify ownership
    if (ownerId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. You do not have permission to view this site source.' }, { status: 403 })
    }

    return NextResponse.json({ html: siteFiles[0].content })

  } catch (error) {
    console.error('Failed to fetch site source:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
