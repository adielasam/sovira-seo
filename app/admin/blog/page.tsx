import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminBlogPage() {
  const supabase = await createClient()

  // Fetch blogs
  const { data: blogs, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching blogs:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Blog Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your SEO-optimized blog posts.</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/admin/blog/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Write New Post
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Author</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!blogs || blogs.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No blog posts found. Click "Write New Post" to get started.
                  </td>
                </tr>
              ) : (
                blogs.map((blog: any) => (
                  <tr key={blog.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">{blog.title}</div>
                      <div className="text-slate-500 text-xs truncate max-w-[200px]">{blog.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        blog.published 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {blog.published ? 'Live' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{((blog as any).author)?.full_name || ((blog as any).author)?.email || 'Unknown'}</td>
                    <td className="px-6 py-4">{new Date(blog.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`https://www.sovira.com.ng/blog/${blog.slug}`}
                          target="_blank"
                          title="View Live" 
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/admin/blog/${blog.id}`}
                          title="Edit Post" 
                          className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
