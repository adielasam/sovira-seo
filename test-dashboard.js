const { generateObject } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { z } = require('zod');

const nara = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

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
    data: z.array(z.record(z.string(), z.any())).describe('The data points for the chart, reconstructed from the summary'),
  })).max(3).describe('Up to 3 recommended charts based on the summary data (e.g. regional breakdown, growth trend)'),
  layoutOrder: z.array(z.string()).describe('An array of chart IDs specifying the recommended display order'),
});

async function main() {
  console.log("Starting full generation test...");
  try {
    const summary = {
      meta: { totalRows: 100, detectedRoles: { revenueColumn: "Sales" } },
      metrics: { totalRevenue: 1000, netProfit: 500, profitMargin: 50, periodGrowth: 10 }
    };
    
    console.log("Calling generateObject...");
    const result = await generateObject({
      model: nara('llama-3.1-8b-instant'),
      mode: 'json',
      schema: dashboardSpecSchema,
      system: "You are Sovira AI, an expert Business Intelligence consultant. Generate the dashboard spec based on this summary.",
      prompt: `Here is the highly compressed dataset summary:\n\n${JSON.stringify(summary, null, 2)}`
    });
    console.log("SUCCESS!");
    console.log(JSON.stringify(result.object, null, 2));
  } catch (err) {
    console.error("FAILED!");
    console.error(err);
  }
}

main();
