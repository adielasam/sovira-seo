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
    console.error('Error saving blog post:', error)
    return { error: 'Failed to save blog post' }
  }

  revalidatePath('/admin/blog')
  revalidatePath('/blog')
  redirect('/admin/blog')
}
