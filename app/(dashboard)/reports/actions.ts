'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkUsageLimit } from '@/lib/usage'

export async function generateReportAction(type: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }

  const { limitReached } = await checkUsageLimit(user.id, 'audit') // Using audit usage limit for reports
  if (limitReached) {
    return { error: 'LIMIT_REACHED', message: 'You have reached your Free plan report generation limit.' }
  }

  try {
    // Generate some structured data based on the report type.
    // In a full production app, this would query all tables (keywords, competitors, audits) 
    // and compile the actual data payload. We simulate this compilation step here.
    const reportData = {
      executiveSummary: "Your overall SEO health is improving. We have tracked a 15% increase in organic keywords.",
      totalKeywords: Math.floor(Math.random() * 5000) + 1000,
      averagePosition: Math.floor(Math.random() * 20) + 1,
      healthScore: Math.floor(Math.random() * 30) + 70,
      generatedAt: new Date().toISOString()
    }

    // Size is an estimate string for the UI
    const sizeEstimate = `${(Math.random() * 2 + 0.5).toFixed(1)} MB`

    const { data, error } = await supabase.from('reports').insert([{
      user_id: user.id,
      name,
      type,
      size: sizeEstimate,
      content: reportData
    }]).select('id').single()

    if (error) throw error

    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'Report Generated',
      details: { type, name, reportId: data.id }
    }])

    revalidatePath('/reports')
    return { success: true, id: data.id }
  } catch (error: any) {
    console.error('Report Generation Error:', error)
    return { error: error.message || 'Failed to generate report.' }
  }
}

export async function getReportsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data }
}

export async function getReportByIdAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return { error: error.message }
  return { data }
}
