'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Simple deterministic pseudo-random number generator
function seededRand(seed: number, index: number) {
  const x = Math.sin(seed + index) * 10000
  return x - Math.floor(x)
}

export async function getBacklinksAction(domain: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('backlinks')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_domain', domain)
    .order('discovered_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data, error: null }
}

export async function scanBacklinksAction(domain: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Generate deterministic mock backlinks based on the domain length/chars
    const seed = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    const mockDomains = [
      'techcrunch.com', 'searchengineland.com', 'moz.com', 'hubspot.com',
      'medium.com', 'forbes.com', 'businessinsider.com', 'marketingprofs.com',
      'smallbiztrends.com', 'enterpreneur.com', 'ycombinator.com', 'news.com',
      'spammy-directory-xyz.com', 'cheap-seo-links.net', 'seo-guru-blog.org',
      'wordpress.com', 'blogger.com', 'tumblr.com', 'reddit.com', 'quora.com'
    ]

    const numToGenerate = Math.floor(seededRand(seed, 0) * 10) + 15 // 15 to 25 links

    const generatedLinks = []
    
    // Set discovered date to spread over the last 30 days
    const now = new Date()

    for (let i = 0; i < numToGenerate; i++) {
      const isSpammy = seededRand(seed, i * 2) > 0.8
      const sourceDomain = mockDomains[Math.floor(seededRand(seed, i * 3) * mockDomains.length)]
      
      let da = Math.floor(seededRand(seed, i * 4) * 80) + 10
      let spam = Math.floor(seededRand(seed, i * 5) * 5)
      
      if (isSpammy || sourceDomain.includes('spammy') || sourceDomain.includes('cheap')) {
        da = Math.floor(seededRand(seed, i * 4) * 20) + 1
        spam = Math.floor(seededRand(seed, i * 5) * 70) + 30
      } else if (sourceDomain.includes('techcrunch') || sourceDomain.includes('forbes')) {
        da = Math.floor(seededRand(seed, i * 4) * 10) + 85
      }

      const status = seededRand(seed, i * 6) > 0.85 ? 'lost' : 'active'
      
      const discoveredDaysAgo = Math.floor(seededRand(seed, i * 7) * 30)
      const discoveredDate = new Date(now)
      discoveredDate.setDate(discoveredDate.getDate() - discoveredDaysAgo)

      generatedLinks.push({
        user_id: user.id,
        project_domain: domain,
        source_url: `https://${sourceDomain}/article-${i}`,
        target_page: seededRand(seed, i * 8) > 0.6 ? `/${domain.split('.')[0]}-guide` : '/',
        anchor_text: seededRand(seed, i * 9) > 0.5 ? domain : `Best ${domain.split('.')[0]} tools`,
        domain_authority: da,
        spam_score: spam,
        status: status,
        discovered_at: discoveredDate.toISOString()
      })
    }

    // First delete old mock links for this domain to avoid duplicates on rescan
    await supabase.from('backlinks').delete().eq('user_id', user.id).eq('project_domain', domain)
    
    // Insert new mock links
    const { error } = await supabase.from('backlinks').insert(generatedLinks)
    if (error) throw error

    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action: 'Backlink Scan Completed',
      details: { domain, count: generatedLinks.length }
    }])

    revalidatePath('/backlinks')
    return { success: true, count: generatedLinks.length }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || 'Failed to scan backlinks' }
  }
}

export async function addBacklinkAction(data: { domain: string, sourceUrl: string, targetPage: string, anchorText: string, da: number, spam: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { error } = await supabase.from('backlinks').insert([{
      user_id: user.id,
      project_domain: data.domain,
      source_url: data.sourceUrl,
      target_page: data.targetPage || '/',
      anchor_text: data.anchorText || data.sourceUrl,
      domain_authority: data.da || 1,
      spam_score: data.spam || 0,
      status: 'active'
    }])

    if (error) throw error

    revalidatePath('/backlinks')
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || 'Failed to add backlink' }
  }
}
