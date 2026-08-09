import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendBeforeDeletionWarning } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify Vercel Cron Secret for security
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Find all projects that were last updated > 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: abandonedProjects, error: fetchError } = await supabase
      .from('content_generations')
      .select('id, topic, user_id')
      .in('tone', ['INSTANT_SITE', 'INSTANT_SITE_BINARY'])
      .lt('updated_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    if (!abandonedProjects || abandonedProjects.length === 0) {
      return NextResponse.json({ message: 'No abandoned projects found.' });
    }

    let emailsSent = 0;

    // 2. Loop through and check if the user is on a free plan
    for (const project of abandonedProjects) {
      if (!project.user_id) continue;

      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan, email')
        .eq('id', project.user_id)
        .single();

      if (profile && profile.plan === 'free' && profile.email) {
        // Send email
        const projectName = (project.topic || 'Untitled').split('|')[0] || 'My Site';
        const result = await sendBeforeDeletionWarning(profile.email, projectName);
        if (result.success) {
          emailsSent++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cron executed successfully. Scanned ${abandonedProjects.length} projects, sent ${emailsSent} warnings.` 
    });

  } catch (err: any) {
    console.error('Abandoned projects cron failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
