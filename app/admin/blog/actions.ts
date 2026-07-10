'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveBlogPost(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify admin status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && user.email !== 'microsoftportharcourt@gmail.com') {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  let slug = formData.get('slug') as string
  const content = formData.get('content') as string
  const meta_title = formData.get('meta_title') as string
  const meta_description = formData.get('meta_description') as string
  const image_url = formData.get('image_url') as string
  const published = formData.get('published') === 'on'

  if (!title || !content) {
    return { error: 'Title and content are required' }
  }

  if (!slug) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }

  const { error } = await supabase.from('blog_posts').insert({
    title,
    slug,
    content,
    meta_title,
    meta_description,
    image_url,
    published,
    author_id: user.id
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'A blog post with this URL slug already exists.' }
    }
    console.error('Error saving blog post:', JSON.stringify(error, null, 2))
    return { error: `Failed to save blog post: ${error.message} - ${error.details || ''} - ${error.hint || ''}` }
  }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  redirect('/admin/blog')
}

export async function updateBlogPost(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify admin status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && user.email !== 'microsoftportharcourt@gmail.com') {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  let slug = formData.get('slug') as string
  const content = formData.get('content') as string
  const meta_title = formData.get('meta_title') as string
  const meta_description = formData.get('meta_description') as string
  const image_url = formData.get('image_url') as string
  const published = formData.get('published') === 'on'

  if (!title || !content) {
    return { error: 'Title and content are required' }
  }

  if (!slug) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }

  const { error } = await supabase
    .from('blog_posts')
    .update({
      title,
      slug,
      content,
      meta_title,
      meta_description,
      image_url,
      published,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'A blog post with this URL slug already exists.' }
    }
    console.error('Error updating blog post:', JSON.stringify(error, null, 2))
    return { error: `Failed to update blog post: ${error.message}` }
  }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  revalidatePath(`/blog/${slug}`)
  redirect('/admin/blog')
}

export async function deleteBlogPost(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify admin status
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && user.email !== 'microsoftportharcourt@gmail.com') {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting blog post:', JSON.stringify(error, null, 2))
    return { error: `Failed to delete blog post: ${error.message}` }
  }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  return { success: true }
}

