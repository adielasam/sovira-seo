import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Keep the function alive for up to 60 seconds (Vercel hobby limit is 10s, pro is 60s/300s)
export const maxDuration = 60; 

function shouldPublishToday(frequency: string, lastPublishedAt: string | null): boolean {
  if (!lastPublishedAt) return true; // Never published
  
  const lastDate = new Date(lastPublishedAt).getTime();
  const now = Date.now();
  const diffHours = (now - lastDate) / (1000 * 60 * 60);

  switch (frequency.toLowerCase()) {
    case 'daily':
      return diffHours >= 23; // At least 23 hours ago
    case 'weekly':
      return diffHours >= (7 * 24 - 1);
    case 'biweekly':
      return diffHours >= (14 * 24 - 1);
    case 'monthly':
      return diffHours >= (28 * 24 - 1);
    default:
      return false;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  // Protect the cron endpoint
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 1. Fetch all eligible users for auto-publishing
  const { data: users, error: fetchError } = await supabase
    .from('user_profiles')
    .select('id, auto_publish_frequency, auto_publish_topics, last_auto_published_at, cms_provider, wp_url, wp_username, wp_app_password, blogger_access_token, blogger_refresh_token, blogger_blog_id')
    .eq('auto_publish_enabled', true)

  if (fetchError || !users) {
    console.error('Error fetching users for cron:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  const results = []

  // 2. Loop through users and process
  for (const user of users) {
    try {
      // Check frequency schedule
      if (!shouldPublishToday(user.auto_publish_frequency || 'daily', user.last_auto_published_at)) {
        continue; // Skip this user, not time yet
      }

      // Check if they have topics
      if (!user.auto_publish_topics || user.auto_publish_topics.length === 0) {
        continue;
      }

      // Pick a random topic from their list
      const randomTopic = user.auto_publish_topics[Math.floor(Math.random() * user.auto_publish_topics.length)]

      // Generate content via Nara AI
      const prompt = `You are an expert SEO Content Writer. Write a comprehensive Blog Post about: "${randomTopic}".
      CRITICAL FORMATTING RULES:
      1. USE Markdown formatting! Use # for H1, ## for H2.
      2. Write naturally, as a human writer would. Return ONLY the raw markdown.`

      const aiResponse = await fetch(`https://router.bynara.id/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NARA_API_KEY || 'sk-nry-6B9r9RkKfP3tjv7PGx8sLdq8z7x0htWoDVEuHsFy0rs'}`
        },
        body: JSON.stringify({
          model: 'mistral-large',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      if (!aiResponse.ok) {
        throw new Error(`AI generation failed: ${aiResponse.statusText}`)
      }

      const aiData = await aiResponse.json()
      const markdownContent = aiData.choices?.[0]?.message?.content
      if (!markdownContent) throw new Error('Empty AI response')

      // Extract title from first H1 or use topic
      let title = randomTopic
      const titleMatch = markdownContent.match(/^# (.*$)/im)
      if (titleMatch) title = titleMatch[1].trim()

      // Convert to basic HTML for CMS
      let htmlContent = markdownContent
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n\n/gim, '</p><p>')
      htmlContent = `<p>${htmlContent}</p>`

      // Publish to WordPress
      if (user.cms_provider === 'wordpress' && user.wp_url && user.wp_username && user.wp_app_password) {
        const wpEndpoint = `${user.wp_url}/wp-json/wp/v2/posts`
        const credentials = Buffer.from(`${user.wp_username}:${user.wp_app_password}`).toString('base64')

        const wpResponse = await fetch(wpEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`
          },
          body: JSON.stringify({
            title: title,
            content: htmlContent,
            status: 'publish' // Push as live automatically!
          })
        })

        if (!wpResponse.ok) {
          throw new Error(`WP Publish failed: ${wpResponse.statusText}`)
        }
      } 
      // Publish to Blogger
      else if (user.cms_provider === 'blogger' && user.blogger_refresh_token) {
        // 1. Refresh the access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: user.blogger_refresh_token,
            grant_type: 'refresh_token'
          })
        })

        if (!tokenResponse.ok) {
          throw new Error('Failed to refresh Blogger access token')
        }
        
        const { access_token } = await tokenResponse.json()

        // 2. We need the blog ID. If we don't have it saved, fetch it
        let blogId = user.blogger_blog_id;
        if (!blogId) {
          const blogResponse = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
            headers: { 'Authorization': `Bearer ${access_token}` }
          })
          if (blogResponse.ok) {
            const blogData = await blogResponse.json()
            if (blogData.items && blogData.items.length > 0) {
              blogId = blogData.items[0].id
              // Save it for next time
              await supabase.from('user_profiles').update({ blogger_blog_id: blogId }).eq('id', user.id)
            }
          }
        }

        if (!blogId) {
          throw new Error('No Blogger blog found for this user.')
        }

        // 3. Publish to Blogger
        const bloggerResponse = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: title,
            content: htmlContent
          })
        })

        if (!bloggerResponse.ok) {
          throw new Error(`Blogger publish failed: ${await bloggerResponse.text()}`)
        }
      }
      else {
        throw new Error('No valid CMS connected for auto-publishing.')
      }

      // Update last published timestamp
      await supabase
        .from('user_profiles')
        .update({ last_auto_published_at: new Date().toISOString() })
        .eq('id', user.id)

      // Log success
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: 'Auto-Published Blog',
        details: { topic: randomTopic, provider: user.cms_provider }
      }])

      results.push({ userId: user.id, status: 'success', topic: randomTopic })
    } catch (err: any) {
      console.error(`Cron error for user ${user.id}:`, err)
      results.push({ userId: user.id, status: 'failed', error: err.message })
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}
