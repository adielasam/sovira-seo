import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFreeToolDailyUsage, FreeToolType } from '@/lib/usage'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tool = searchParams.get('tool') as FreeToolType
  
  if (!tool) {
    return NextResponse.json({ error: 'Tool type required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const limits = await checkFreeToolDailyUsage(user.id, tool)
    return NextResponse.json(limits)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
