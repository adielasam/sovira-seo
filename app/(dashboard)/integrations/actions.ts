'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { decrypt } from '@/lib/encryption'

export async function getCmsIntegration() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('cms_provider, wp_url, wp_username, wp_app_password, cms_connected_at, auto_publish_enabled, auto_publish_frequency, auto_publish_topics, blogger_access_token')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching CMS integration:', error)
    return { data: null } 
  }

  // Phase 3: Live WP status check
  let wp_status = 'disconnected'
  if (data.cms_provider === 'wordpress' && data.wp_url && data.wp_username && data.wp_app_password) {
    try {
      const decryptedPassword = decrypt(data.wp_app_password)
      if (decryptedPassword) {
        const credentials = Buffer.from(`${data.wp_username}:${decryptedPassword}`).toString('base64')
        const wpEndpoint = `${data.wp_url}/wp-json/wp/v2/users/me`
        
        // Simple cache approach: Just fetch directly (Vercel caches fetch slightly by default depending on Next.js setup, but we'll set next: { revalidate: 300 } for 5-minute cache)
        const response = await fetch(wpEndpoint, {
          method: 'GET',
          headers: { 'Authorization': `Basic ${credentials}` },
          next: { revalidate: 300 } // 5 minutes cache
        })
        
        wp_status = response.ok ? 'connected' : 'reconnect_required'
      } else {
        wp_status = 'reconnect_required'
      }
    } catch (e) {
      wp_status = 'reconnect_required'
    }
  }

  // Remove the password from the returned data for security
  delete data.wp_app_password

  return { data: { ...data, wp_status } }
}

export async function updateAutoPublishSettings(enabled: boolean, frequency: string, topics: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      auto_publish_enabled: enabled,
      auto_publish_frequency: frequency,
      auto_publish_topics: topics ? topics.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating auto publish settings:', error)
    return { error: 'Failed to update settings.' }
  }

  revalidatePath('/integrations')
  return { success: true }
}

import { encrypt } from '@/lib/encryption'

export async function connectWordPress(wpUrl: string, wpUsername: string, wpAppPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const cleanUrl = wpUrl.replace(/\/+$/, '')

  // 1. Live Check: Verify credentials against WP API before saving
  try {
    const wpEndpoint = `${cleanUrl}/wp-json/wp/v2/users/me`
    const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64')
    const response = await fetch(wpEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    })

    if (!response.ok) {
      return { error: `WordPress connection failed. Status: ${response.status}. Please check your credentials.` }
    }
  } catch (error: any) {
    console.error('WP Live Check Error:', error)
    return { error: 'Failed to reach WordPress site. Please check the URL and your connection.' }
  }

  // 2. Encrypt the password
  const encryptedPassword = encrypt(wpAppPassword)

  // Save the real WordPress credentials
  const { error } = await supabase
    .from('user_profiles')
    .update({
      cms_provider: 'wordpress',
      wp_url: cleanUrl,
      wp_username: wpUsername,
      wp_app_password: encryptedPassword,
      cms_connected_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) {
    console.error(`Error connecting WordPress:`, error)
    return { error: 'Failed to connect CMS. Please ensure the database schema is updated (cms_schema.sql).' }
  }

  // Log activity
  await supabase.from('activity_logs').insert([{
    user_id: user.id,
    action: 'CMS Connected',
    details: { provider: 'wordpress', url: cleanUrl }
  }])

  revalidatePath('/integrations')
  revalidatePath('/content')
  return { success: true }
}

export async function disconnectCms() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      cms_provider: null,
      wp_url: null,
      wp_username: null,
      wp_app_password: null,
      cms_connected_at: null
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error disconnecting CMS:', error)
    return { error: error.message }
  }

  revalidatePath('/integrations')
  revalidatePath('/content')
  return { success: true }
}
