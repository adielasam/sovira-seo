import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: users, error: err } = await supabase.auth.admin.listUsers()
  if (err) return NextResponse.json({ error: err.message })
  
  const user = users.users.find(u => u.email === 'adielasam2015@gmail.com')
  if (!user) return NextResponse.json({ error: 'User not found' })
  
  const { error: updErr } = await supabase.from('user_profiles').update({ plan: 'agency' }).eq('id', user.id)
  if (updErr) return NextResponse.json({ error: updErr.message })

  return NextResponse.json({ success: true, message: 'Granted 100-year agency plan to adielasam2015@gmail.com' })
}
