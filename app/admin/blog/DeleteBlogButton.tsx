'use client'

import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { deleteBlogPost } from './actions'
import { toast } from 'react-hot-toast'

export default function DeleteBlogButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      startTransition(async () => {
        const result = await deleteBlogPost(id)
        if (result?.error) {
          toast.error(result.error)
        } else {
          toast.success('Post deleted successfully')
        }
      })
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete Post"
      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
