'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCmsIntegration() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('cms_provider, wp_url, wp_username, cms_connected_at, auto_publish_enabled, auto_publish_frequency, auto_publish_topics, blogger_access_token')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching CMS integration:', error)
    return { data: null } 
  }

  return { data }
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

export async function connectWordPress(wpUrl: string, wpUsername: string, wpAppPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Save the real WordPress credentials
  const { error } = await supabase
    .from('user_profiles')
    .update({
      cms_provider: 'wordpress',
      wp_url: wpUrl.replace(/\/+$/, ''), // Remove trailing slashes
      wp_username: wpUsername,
      wp_app_password: wpAppPassword,
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
    details: { provider: 'wordpress', url: wpUrl }
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
