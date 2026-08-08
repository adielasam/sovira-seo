import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  try {
    const { slug, path } = await params
    const supabase = createAdminClient()

    let filePath = 'index.html'
    if (path && path.length > 0) {
      filePath = path.join('/')
    }

    const { data: file, error: fileError } = await supabase
      .from('content_generations')
      .select('generated_content, content_type')
      .eq('tone', 'INSTANT_SITE')
      .eq('topic', `${slug}|${filePath}`)
      .single()

    if (fileError || !file) {
      const fallbackPath = filePath.endsWith('/') ? `${filePath}index.html` : `${filePath}/index.html`
      
      const { data: fallbackFile, error: fallbackError } = await supabase
        .from('content_generations')
        .select('generated_content, content_type')
        .eq('tone', 'INSTANT_SITE')
        .eq('topic', `${slug}|${fallbackPath}`)
        .single()
        
      if (fallbackError || !fallbackFile) {
        return new NextResponse(`File not found: ${filePath}`, { status: 404 })
      }
      
      return new NextResponse(fallbackFile.generated_content, {
        headers: {
          'Content-Type': fallbackFile.content_type,
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:;"
        }
      })
    }

    return new NextResponse(file.generated_content, {
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
