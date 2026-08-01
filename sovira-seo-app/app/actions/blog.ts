'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addComment(formData: FormData) {
  const name = formData.get('name') as string
  const comment = formData.get('comment') as string
  const post_id = formData.get('post_id') as string
  const slug = formData.get('slug') as string

  if (!name || !comment || !post_id) {
    return { error: 'Please fill in all required fields' }
  }

  const supabase = await createClient()

  // Verify the post exists
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('id', post_id)
    .single()

  if (postError || !post) {
    return { error: 'Blog post not found' }
  }

  // Insert the comment
  const { error } = await supabase
    .from('blog_comments')
    .insert([{
      post_id,
      name,
      content: comment,
      is_approved: true // Auto-approve for now, can be changed later
    }])

  if (error) {
    console.error('Failed to add comment:', error)
    return { error: 'Failed to post comment. Please try again later.' }
  }

  revalidatePath(`/blog/${slug}`)
  return { success: true }
}

export async function getComments(post_id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('blog_comments')
    .select('*')
    .eq('post_id', post_id)
    .eq('is_approved', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch comments:', error)
    return []
  }

  return data
}
