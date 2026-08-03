'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementDashboardUsage } from '@/lib/usage'
import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

// TODO: wire to credits system + swap to Nara API before production
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const dashboardSpecSchema = z.object({
  executiveSummary: z.string().describe('A short executive summary (3-5 sentences) in plain business language analyzing the dataset. Explain what is working, what is declining, and what to watch based on the computed KPIs and chart data. No jargon, do not restate raw numbers verbatim — interpret them.'),
  kpis: z.array(z.object({
    title: z.string().describe('The name of the KPI (e.g., Total Revenue)'),
    value: z.string().describe('The formatted value of the KPI (e.g., $1.2M, 45%)'),
    delta: z.string().nullable().describe('The period-over-period growth or change, if applicable (e.g., +5.2%)'),
    sentiment: z.enum(['positive', 'negative', 'neutral']).describe('The sentiment of the delta for coloring'),
  })).max(8).describe('Top 4 to 8 most important key performance indicators derived from the summary'),
  charts: z.array(z.object({
    id: z.string().describe('A unique identifier for the chart (e.g., c1, c2)'),
    title: z.string().describe('A descriptive title for the chart'),
    type: z.enum(['bar', 'line', 'pie']).describe('The best Recharts chart type for this data'),
    dataKey: z.string().describe('The main metric key to plot (e.g., revenue, value)'),
    categoryKey: z.string().describe('The category/label key to plot against (e.g., region, date, name)'),
    data: z.array(z.record(z.string(), z.any())).describe('The data points for the chart, reconstructed from the summary'),
  })).max(4).describe('Up to 4 recommended charts based on the summary data (e.g. regional breakdown, growth trend)'),
  layoutOrder: z.array(z.string()).describe('An array of chart IDs (from the charts array) specifying the recommended display order'),
})

export type DashboardSpec = z.infer<typeof dashboardSpecSchema>

export async function generateExecutiveInsight(aggregates: any): Promise<{ success: boolean; insight?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!process.env.GROQ_API_KEY) {
      return { success: false, error: 'GROQ_API_KEY environment variable is missing.' }
    }

    const systemPrompt = `You are a Data Analyst. Your job is to provide a highly concise, 2-sentence "Executive Insight" summary based ONLY on the provided aggregated data. Do not hallucinate numbers. Point out the top performing metric or any obvious areas of interest based on the provided totals and breakdowns.`;

    // We can use generateObject with a simple schema, or generateText. We already import generateObject.
    const result = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      mode: 'json',
      schema: z.object({ insight: z.string().describe("A 2-sentence plain-English executive summary.") }),
      system: systemPrompt,
      prompt: `Here is the pre-computed aggregated data (Top KPIs and Breakdowns):\n\n${JSON.stringify(aggregates, null, 2)}\n\nGenerate the 2-sentence insight.`,
    })

    return { success: true, insight: (result.object as any).insight }

  } catch (error: any) {
    console.error('AI Insight Generation Error:', error)
    return { success: false, error: error.message || 'Failed to generate insight' }
  }
}

export async function generateDashboardSpec(summary: any): Promise<{ success: boolean; spec?: DashboardSpec; error?: string; resetsAt?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!process.env.GROQ_API_KEY) {
      return { success: false, error: 'GROQ_API_KEY environment variable is missing on Vercel. Please add it to your project settings.' }
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
    const systemPrompt = `You are Sovira AI, an expert Business Intelligence consultant. Generate the dashboard spec based on this summary. 
YOU MUST RETURN A JSON OBJECT WITH EXACTLY THESE ROOT KEYS: "executiveSummary", "kpis", "charts", "layoutOrder".
Example format:
{
  "executiveSummary": "Your 3-5 sentence summary here.",
  "kpis": [
    { "title": "Revenue", "value": "$1.2M", "delta": "+5%", "sentiment": "positive" },
    { "title": "Profit Margin", "value": "18%", "delta": "-2%", "sentiment": "negative" }
  ],
  "charts": [
    { "id": "c1", "title": "Sales by Region", "type": "bar", "dataKey": "revenue", "categoryKey": "region", "data": [{"region": "North", "revenue": 1000}] },
    { "id": "c2", "title": "Monthly Trend", "type": "line", "dataKey": "sales", "categoryKey": "month", "data": [{"month": "Jan", "sales": 500}] }
  ],
  "layoutOrder": ["c1", "c2"]
}`

    const result = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      mode: 'json',
      schema: dashboardSpecSchema,
      system: systemPrompt,
      prompt: `Here is the highly compressed dataset summary:\n\n${JSON.stringify(summary, null, 2)}\n\nGenerate the dashboard spec based on this summary.`,
    })

    return { success: true, spec: result.object as DashboardSpec }

  } catch (error: any) {
    console.error('AI Dashboard Generation Error:', error)
    return { success: false, error: error.message || 'Failed to generate dashboard' }
  }
}
