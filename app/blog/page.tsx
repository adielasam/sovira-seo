import { createClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { ArrowRight, Calendar, User } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog | Sovira SEO',
  description: 'Read the latest insights, strategies, and updates from the Sovira SEO team.',
}

export const revalidate = 60 // Revalidate every 60 seconds

export default async function BlogPage() {
  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('title, slug, meta_description, image_url, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching blogs:', error)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0F172A]">
      <Navbar />
      
      <main className="flex-1 mt-20">
        <div className="bg-slate-900 text-white py-20 px-6 sm:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50" />
          <div className="relative z-10 max-w-4xl mx-auto space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">Sovira Blog</h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
              SEO strategies, product updates, and content marketing tips to help you grow.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-16">
          {(!posts || posts.length === 0) ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-xl">No posts available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link href={`/blog/${post.slug}`} key={post.slug} className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                  {post.image_url ? (
                    <div className="h-48 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img 
                        src={post.image_url} 
                        alt={post.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                      <span className="text-4xl">📝</span>
                    </div>
                  )}
                  
                  <div className="p-6 flex flex-col flex-1">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-6 flex-1">
                      {post.meta_description || 'Read this article to learn more about our SEO strategies...'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {(post.author as any)?.full_name || 'Sovira Team'}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
