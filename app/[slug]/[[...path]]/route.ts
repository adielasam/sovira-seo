import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  try {
    const { slug, path } = await params
    const supabase = createAdminClient()

    let filePath = ''
    if (path && path.length > 0) {
      filePath = path.join('/')
    }

    const searchPath = filePath || 'index.html'

    const { data: file, error: fileError } = await supabase
      .from('content_generations')
      .select('generated_content, content_type, tone')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .eq('topic', `${slug}|${searchPath}`)
      .single()

    if (fileError || !file) {
      if (!filePath || filePath === 'index.html') {
        return new NextResponse(`File not found: ${searchPath}`, { status: 404 })
      }
      
      const fallbackPath = filePath.endsWith('/') ? `${filePath}index.html` : `${filePath}/index.html`
      
      const { data: fallbackFile, error: fallbackError } = await supabase
        .from('content_generations')
        .select('generated_content, content_type, tone')
        .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
        .eq('topic', `${slug}|${fallbackPath}`)
        .single()
        
      if (fallbackError || !fallbackFile) {
        return new NextResponse(`File not found: ${filePath}`, { status: 404 })
      }
      
      const content = fallbackFile.tone === 'INSTANT_SITE_BINARY' 
        ? Buffer.from(fallbackFile.generated_content, 'base64') 
        : fallbackFile.generated_content

      return new NextResponse(content, {
        headers: {
          'Content-Type': fallbackFile.content_type,
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:;"
        }
      })
    }

    let finalContent: any = file.tone === 'INSTANT_SITE_BINARY' 
      ? Buffer.from(file.generated_content, 'base64') 
      : file.generated_content

    // Inject base tag for HTML files to fix relative asset paths natively
    if (file.content_type === 'text/html' && typeof finalContent === 'string') {
      const baseTag = `<base href="/${slug}/">`
      if (finalContent.match(/<head[^>]*>/i)) {
        finalContent = finalContent.replace(/(<head[^>]*>)/i, `$1\n  ${baseTag}`)
      } else if (finalContent.match(/<html[^>]*>/i)) {
        finalContent = finalContent.replace(/(<html[^>]*>)/i, `$1\n<head>\n  ${baseTag}\n</head>`)
      } else {
        finalContent = `${baseTag}\n${finalContent}`
      }
    }

    return new NextResponse(finalContent, {
      headers: {
        'Content-Type': file.content_type,
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:;"
      }
    })

  } catch (error) {
    console.error('Error serving hosted file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
