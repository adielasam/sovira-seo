'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementDashboardUsage } from '@/lib/usage'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

const dashboardSpecSchema = z.object({
  kpis: z.array(z.object({
    title: z.string().describe('The name of the KPI (e.g., Total Revenue)'),
    value: z.string().describe('The formatted value of the KPI (e.g., $1.2M, 45%)'),
    delta: z.string().nullable().describe('The period-over-period growth or change, if applicable (e.g., +5.2%)'),
    sentiment: z.enum(['positive', 'negative', 'neutral']).describe('The sentiment of the delta for coloring'),
  })).max(4).describe('Top 4 most important key performance indicators derived from the summary'),
  charts: z.array(z.object({
    id: z.string().describe('A unique identifier for the chart'),
    title: z.string().describe('A descriptive title for the chart'),
    type: z.enum(['bar', 'line', 'pie']).describe('The best Recharts chart type for this data'),
    dataKey: z.string().describe('The main metric key to plot (e.g., revenue, value)'),
    categoryKey: z.string().describe('The category/label key to plot against (e.g., region, date, name)'),
    data: z.array(z.record(z.any())).describe('The data points for the chart, reconstructed from the summary'),
  })).max(3).describe('Up to 3 recommended charts based on the summary data (e.g. regional breakdown, growth trend)'),
  layoutOrder: z.array(z.string()).describe('An array of chart IDs specifying the recommended display order'),
})

export type DashboardSpec = z.infer<typeof dashboardSpecSchema>

export async function generateDashboardSpec(summary: any): Promise<{ success: boolean; spec?: DashboardSpec; error?: string; resetsAt?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // 1. Check and increment usage
    const usageCheck = await checkAndIncrementDashboardUsage(user.id)
    if (!usageCheck.allowed) {
      return { 
        success: false, 
        error: 'LIMIT_REACHED', 
        resetsAt: usageCheck.resetsAt 
      }
    }

    // 2. Generate Spec via AI
    const systemPrompt = `You are Sovira AI, an expert Business Intelligence consultant. 
Your task is to analyze the provided dataset summary and design an executive dashboard specification.
The user wants to see the most important KPIs, and visually compelling charts (bar, line, or pie) that highlight trends or regional/categorical breakdowns.
You must return a valid JSON object matching the requested schema.
NEVER reference your underlying model or vendor.`

    const result = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: dashboardSpecSchema,
      system: systemPrompt,
      prompt: `Here is the highly compressed dataset summary:\n\n${JSON.stringify(summary, null, 2)}\n\nGenerate the dashboard spec based on this summary.`,
    })

    return { success: true, spec: result.object }

  } catch (error: any) {
    console.error('AI Dashboard Generation Error:', error)
    return { success: false, error: error.message || 'Failed to generate dashboard' }
  }
}
