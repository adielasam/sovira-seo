import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { base64Image, fileName } = await req.json()
    if (!base64Image) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    const filePath = `ai-video/${Date.now()}_${fileName || 'image.jpg'}`

    const { data, error } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg'
      })

    if (error) throw error

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
