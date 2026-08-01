'use client'

import { useState } from 'react'
import { addComment } from '@/app/actions/blog'
import toast from 'react-hot-toast'

type Comment = {
  id: string
  name: string
  content: string
  created_at: string
}

export function CommentsSection({ postId, slug, initialComments }: { postId: string, slug: string, initialComments: Comment[] }) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    formData.append('post_id', postId)
    formData.append('slug', slug)

    const result = await addComment(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Comment posted successfully!')
      // Optimistically add the comment
      setComments([
        ...comments,
        {
          id: Math.random().toString(),
          name: formData.get('name') as string,
          content: formData.get('comment') as string,
          created_at: new Date().toISOString()
        }
      ])
      e.currentTarget.reset()
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="mt-16 pt-10 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Leave a Reply</h3>
      
      <form onSubmit={handleSubmit} className="mb-12 space-y-6">
        <p className="text-sm text-slate-500 mb-4">Your email address will not be published. Required fields are marked *</p>
        
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">COMMENT *</label>
          <textarea
            id="comment"
            name="comment"
            rows={5}
            required
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">NAME *</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <p className="text-xs text-slate-500">By submitting this form, you agree to the processing of personal data according to our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'POSTING...' : 'POST COMMENT'}
        </button>
      </form>

      {comments.length > 0 && (
        <div className="space-y-8">
          <h4 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">{comments.length} Comments</h4>
          {comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {comment.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white">{comment.name}</h5>
                  <p className="text-xs text-slate-500">
                    {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
