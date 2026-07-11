import { createClient } from '@/lib/supabase/server'
import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { ShareWidget } from '@/components/blog/ShareWidget'
import { CommentsSection } from '@/components/blog/CommentsSection'
import { SidebarWidgets } from '@/components/blog/SidebarWidgets'
import { Calendar, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getComments } from '@/app/actions/blog'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

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

  const comments = await getComments(post.id)

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
      name: ((post as any).author)?.full_name || 'Sovira Team',
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
      
      <main className="flex-1 mt-20 pb-20">
        {/* Hero Section */}
        <div className="bg-slate-900 text-white pt-20 pb-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-indigo-900/40" />
          
          <div className="max-w-3xl mx-auto relative z-10">
            <Link href="/blog" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
            
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                {post.category || 'Uncategorized'}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{((post as any).author)?.full_name || 'Sovira Team'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 flex flex-col lg:flex-row gap-12 items-start">
          
          {/* Main Article Content */}
          <article className="flex-1 w-full lg:max-w-[800px] min-w-0 overflow-hidden">
            {post.image_url && (
              <div className="w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl mb-12 bg-slate-800 border-4 border-white dark:border-slate-800">
                <img 
                  src={post.image_url} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div 
              className="prose prose-lg dark:prose-invert max-w-[100%] prose-blue text-justify break-words prose-img:rounded-xl prose-headings:font-bold prose-a:text-black dark:prose-a:text-white hover:prose-a:text-blue-600 dark:hover:prose-a:text-blue-400 prose-a:transition-colors prose-a:no-underline hover:prose-a:underline overflow-hidden"
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: post.content.replace(/(&nbsp;|\u00A0)/g, ' ') }}
            />
            
            <ShareWidget title={post.title} url={`https://www.sovira.com.ng/blog/${slug}`} />
            
            <CommentsSection postId={post.id} slug={slug} initialComments={comments} />
            
          </article>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0">
            <SidebarWidgets />
          </aside>
          
        </div>
      </main>

      <Footer />
    </div>
  )
}
