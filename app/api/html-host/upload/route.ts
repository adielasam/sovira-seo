import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    
    const body = await req.json()
    
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Helper to extract title from HTML
    const extractTitle = (files: any[]) => {
      const htmlFile = files.find(f => f.path.toLowerCase() === 'index.html' || f.path.toLowerCase().endsWith('.html'))
      if (htmlFile && htmlFile.content && typeof htmlFile.content === 'string') {
        const match = htmlFile.content.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (match && match[1]) {
          return match[1].trim()
        }
      }
      return null
    }

    const slugify = (text: string) => {
      return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }

    const providedSlug = body.slug
    let slug = providedSlug

    if (!slug) {
      const title = body.projectTitle || extractTitle(body.files)
      const baseSlug = title ? slugify(title) : 'site'

      const generateSuffix = () => Math.random().toString(36).substring(2, 5).toLowerCase()
      slug = baseSlug
      
      // Simple loop to ensure slug uniqueness by checking existing topics
      let isUnique = false
      let attempts = 0
      while (!isUnique && attempts < 5) {
        const { data } = await supabaseAdmin
          .from('content_generations')
          .select('id')
          .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
          .like('topic', `${slug}|%`)
          .limit(1)
        
        if (!data || data.length === 0) {
          isUnique = true
        } else {
          slug = `${baseSlug}-${generateSuffix()}`
          attempts++
        }
      }

      if (!isUnique) {
        return NextResponse.json({ error: 'Failed to generate unique site URL' }, { status: 500 })
      }
    }

    let user_id = body.userId
    
    if (!user_id) {
      // Fallback: pick any valid user_id from the database to satisfy the foreign key constraint
      const { data: adminUser } = await supabaseAdmin.from('user_profiles').select('id').eq('role', 'admin').limit(1).single()
      if (adminUser) {
        user_id = adminUser.id
      }
    }
    
    if (!user_id) {
      return NextResponse.json({ error: 'System configuration error. No admin found for anonymous upload.' }, { status: 500 })
    }

    // Check user plan
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('plan').eq('id', user_id).single()
    const plan = (profile?.plan || 'free').toLowerCase()
    const isFree = plan === 'free' || plan === 'free trial'
    
    // Admins bypass
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id)
    const isAdmin = userData?.user?.email === 'adielasam2015@gmail.com' || userData?.user?.email === 'microsoftportharcourt@gmail.com'

    if (!isAdmin) {
      // 1. Daily Edit Limit (For Free Users)
      if (isFree) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const { count: uploadsToday } = await supabaseAdmin
          .from('content_generations')
          .select('id', { count: 'exact', head: true })
          .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
          .eq('user_id', user_id)
          .like('topic', '%|index.html')
          .gte('created_at', today.toISOString())
          
        // Limit to 3 uploads/edits per day
        if (uploadsToday !== null && uploadsToday >= 3) {
          return NextResponse.json({ 
            error: 'Free tier limit reached. You can only edit/publish sites 2 times per day. Please upgrade to a paid plan for unlimited edits.' 
          }, { status: 403 })
        }
      }

      // 2. Max Sites Limit (Only check when creating a new site)
      if (!providedSlug) {
        let maxSites = 1;
        if (plan === 'basic') maxSites = 5;
        else if (plan === 'starter') maxSites = 10;
        else if (plan === 'pro' || plan === 'agency') maxSites = 999999;

        const { data: userSites } = await supabaseAdmin
          .from('content_generations')
          .select('topic')
          .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
          .eq('user_id', user_id)
          
        if (userSites) {
          const uniqueSlugs = new Set(userSites.map(s => s.topic.split('|')[0]))
          if (uniqueSlugs.size >= maxSites) {
            return NextResponse.json({ 
              error: `Plan limit reached. You can only host ${maxSites} InstantSite(s) at a time on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan. Please upgrade to host more.` 
            }, { status: 403 })
          }
        }
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

    const { error: filesError } = await supabaseAdmin
      .from('content_generations')
      .insert(filesToInsert)

    if (filesError) {
      console.error('Error uploading files:', filesError)
      return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 })
    }

    const hostUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get('origin') || 'http://localhost:3000')
    const finalUrl = hostUrl.includes('localhost') 
      ? `${hostUrl}/${slug}/` 
      : `https://${slug}.sovira.com.ng/`

    return NextResponse.json({ url: finalUrl, slug })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
