import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const dashboardSpecSchema = z.object({
  executiveSummary: z.string().describe('A short executive summary (3-5 sentences) in plain business language analyzing the dataset. Explain what is working, what is declining, and what to watch based on the computed KPIs and chart data. No jargon, do not restate raw numbers verbatim — interpret them.'),
  kpis: z.array(z.object({
    title: z.string().describe('The name of the KPI (e.g., Total Revenue)'),
    value: z.string().describe('The formatted value of the KPI (e.g., $1.2M, 45%)'),
    delta: z.string().nullable().describe('The period-over-period growth or change, if applicable (e.g., +5.2%)'),
    sentiment: z.enum(['positive', 'negative', 'neutral']).describe('The sentiment of the delta for coloring'),
  })).max(4),
  charts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['bar', 'line', 'pie']),
    dataKey: z.string(),
    categoryKey: z.string(),
    data: z.array(z.record(z.string(), z.any())),
  })).max(3),
  layoutOrder: z.array(z.string()),
});

const summary = {
  totalRevenue: 2582486,
  totalCost: 0,
  netProfit: 0,
  profitMargin: 0,
  periodGrowth: null,
  regionalBreakdown: {
    'South': 595566,
    'North': 661211,
    'West': 662344,
    'East': 663364
  },
  temporalTrend: []
};

async function test() {
  try {
    const result = await generateObject({
      model: google('gemini-1.5-flash'),
      mode: 'json',
      schema: dashboardSpecSchema,
      system: 'You are Sovira AI, an expert Business Intelligence consultant. Generate the dashboard spec based on this summary.',
      prompt: JSON.stringify(summary, null, 2),
    });
    console.log(JSON.stringify(result.object, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
