import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  try {
    const { slug, path } = await params
    
    // We use createAdminClient to ensure we can read public files even without RLS setup perfectly
    const supabase = createAdminClient()

    // 1. Look up the site ID from the slug
    const { data: site, error: siteError } = await supabase
      .from('hosted_sites')
      .select('id')
      .eq('slug', slug)
      .single()

    if (siteError || !site) {
      return new NextResponse('Site not found', { status: 404 })
    }

    // 2. Determine the requested file path
    // If no path is provided, default to 'index.html'
    let filePath = 'index.html'
    if (path && path.length > 0) {
      filePath = path.join('/')
    }

    // 3. Look up the file content
    const { data: file, error: fileError } = await supabase
      .from('hosted_files')
      .select('content, content_type')
      .eq('site_id', site.id)
      .eq('file_path', filePath)
      .single()

    if (fileError || !file) {
      // If they requested a directory and we don't have it, try appending index.html
      // e.g., if they requested `/site/slug/about` maybe it's `about/index.html`
      const fallbackPath = filePath.endsWith('/') ? `${filePath}index.html` : `${filePath}/index.html`
      
      const { data: fallbackFile, error: fallbackError } = await supabase
        .from('hosted_files')
        .select('content, content_type')
        .eq('site_id', site.id)
        .eq('file_path', fallbackPath)
        .single()
        
      if (fallbackError || !fallbackFile) {
        return new NextResponse(`File not found: ${filePath}`, { status: 404 })
      }
      
      return new NextResponse(fallbackFile.content, {
        headers: {
          'Content-Type': fallbackFile.content_type,
          // Prevent the browser from rendering potentially malicious scripts on our main domain
          // We use text/html but add basic security headers. For a real production app, 
          // you'd want to host this on a separate domain (e.g., sovirausercontent.com)
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:;"
        }
      })
    }

    // 4. Return the raw file content with the correct Content-Type
    return new NextResponse(file.content, {
      headers: {
        'Content-Type': file.content_type,
        // Optional security header
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:;"
      }
    })

  } catch (error) {
    console.error('Error serving hosted file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
