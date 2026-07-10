import { createClient } from '@/lib/supabase/server'
import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { Calendar, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, meta_title, meta_description, image_url, created_at')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!post) {
    return {
      title: 'Post Not Found | Sovira SEO',
    }
  }

  const title = post.meta_title || post.title
  const description = post.meta_description || 'Read this article on Sovira SEO.'
  const url = `https://www.sovira.com.ng/blog/${slug}`

  return {
    title: `${title} | Sovira SEO`,
    description: description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: post.created_at,
      images: post.image_url ? [
        {
          url: post.image_url,
          width: 1200,
          height: 630,
          alt: title,
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.image_url ? [post.image_url] : [],
    },
    alternates: {
      canonical: url,
    }
  }
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()
    
  if (error) {
    console.error('Error fetching blog post:', error)
  }

  if (!post) {
    notFound()
  }

  // Generate structured data for Google (Article Schema)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    image: post.image_url ? [post.image_url] : [],
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: [{
      '@type': 'Person',
      name: (post.author as any)?.full_name || 'Sovira Team',
    }]
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0F172A]">
      <Navbar />
      
      {/* Inject JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 mt-20">
        <article className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
          
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-8 font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          <header className="space-y-6 mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-400 border-y border-slate-200 dark:border-slate-800 py-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{(post.author as any)?.full_name || 'Sovira Team'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
            </div>
          </header>

          {post.image_url && (
            <div className="mb-12 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
              <img 
                src={post.image_url} 
                alt={post.title} 
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none prose-blue prose-img:rounded-xl prose-headings:font-bold prose-a:text-blue-600">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
          
        </article>
      </main>

      <Footer />
    </div>
  )
}
