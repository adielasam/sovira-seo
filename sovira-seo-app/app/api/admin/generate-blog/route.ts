import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && user.email !== 'microsoftportharcourt@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { topic } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert SEO copywriter and content strategist specializing in Google Webmaster Guidelines and Yoast SEO standards.
Your task is to generate a comprehensive, highly-engaging, and perfectly optimized blog post based on the provided topic/keyword.

Requirements:
1. **Title**: Catchy, includes the main keyword, and drives high CTR (Click-Through Rate).
2. **Slug**: Short, keyword-rich, hyphen-separated, lowercase.
3. **Meta Title**: Max 60 characters, highly optimized for search engines.
4. **Meta Description**: 150-160 characters, compelling, includes a call-to-action (CTA), and naturally contains the main keyword.
5. **Content (HTML)**:
   - Must be incredibly valuable, original, and deeply informative.
   - Use proper HTML headings (<h2>, <h3>) for structure and readability.
   - Include HTML lists (<ul>, <ol>, <li>), bold text (<strong>) for emphasis, and short paragraphs (<p>).
   - Write in a professional yet engaging tone.
   - Naturally weave in LSI (Latent Semantic Indexing) keywords related to the topic.
   - Provide actionable advice, not just fluff.
   - End with a strong conclusion and a call-to-action.

DO NOT include any placeholder text (e.g. "[Insert Image Here]"). The admin will manually add images later.`;

    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      prompt: `Please write a highly-optimized SEO blog post about: "${topic}"`,
      schema: z.object({
        title: z.string().describe('The main title of the blog post.'),
        slug: z.string().describe('The URL slug for the post (e.g., best-seo-strategies).'),
        meta_title: z.string().describe('The SEO meta title (max 60 chars).'),
        meta_description: z.string().describe('The SEO meta description (150-160 chars).'),
        content: z.string().describe('The full blog post content formatted in rich HTML (e.g., <p>, <h2>, <ul>).'),
      }),
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error('Blog Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
