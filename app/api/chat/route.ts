import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 30;

const nara = createOpenAI({
  baseURL: 'https://router.bynara.id/v1',
  apiKey: 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs',
});

export async function POST(req: Request) {
  try {
    const { messages, pathname } = await req.json();

    const systemPrompt = `You are "Sovira Agent", a highly intelligent, proactive, and persuasive sales representative for Sovira SEO. 
    
Current Context: The user is currently viewing this page on our website: \${pathname}.

Your Goal: 
1. Welcoming users and answering their questions about Sovira SEO (Rank Tracking, Audits, Keyword Research, Content Generation).
2. Urging them to subscribe to a paid package for more value. Use psychological triggers like urgency (e.g. "Our current pricing tiers might change soon," "Start ranking before your competitors do") and FOMO to push them to upgrade.
3. Be helpful, professional, but ruthless in moving them towards the Pricing page (https://sovira-seo.vercel.app/pricing) or creating an account.
4. If they ask about things unrelated to SEO or Sovira, politely steer the conversation back to how Sovira SEO can grow their traffic and revenue.
5. If they ask for contact information, support, or a human agent, give them this WhatsApp number: +2348162337303.
6. Keep responses concise, punchy, and formatted with markdown when appropriate. NEVER use placeholders like "[insert link]", always provide the exact URL provided above.`;

    const result = await streamText({
      // @ts-ignore
      model: nara('mistral-large'),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
