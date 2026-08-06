import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Content AI | Sovira AI',
  description: 'Generate high-ranking, SEO-optimized articles, blog posts, and marketing copy instantly with our specialized Content AI engine.',
}

export default function ContentAiPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Write Content That Actually <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Ranks on Page 1</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop struggling with writer's block. Let the Sovira Content AI generate perfectly structured, keyword-optimized articles designed specifically to dominate Google search results.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with Generic AI Writers</h2>
            <p>
              Tools like ChatGPT are great for brainstorming, but they aren't built for SEO. They don't know how to optimize H2 and H3 tags, they don't research secondary LSI keywords, and they don't understand search intent. If you use generic AI to write your blog, you'll end up with fluff that Google ignores.
            </p>

            <h3>Built for Search Engine Optimization</h3>
            <p>
              The Sovira Content AI is explicitly fine-tuned for Generative Engine Optimization (GEO). Before writing a single word, our engine analyzes top-ranking pages for your target keyword. It reverse-engineers their structure, identifies the semantic entities they use, and crafts an article designed to outperform them on every metric.
            </p>

            <h3>Perfect Structuring, Every Time</h3>
            <p>
              We automatically handle the technical on-page elements that manual writers often miss or find tedious. Every article generated includes an optimized H1, logically nested subheadings, an engaging meta description, and natural keyword density without keyword stuffing.
            </p>

            <h3>Scale Your Content Operations</h3>
            <p>
              Whether you are managing a single affiliate site or running a full-service marketing agency, content velocity is the secret to capturing organic market share. What used to take hours of research, outlining, drafting, and editing can now be accomplished in a matter of minutes.
            </p>

            <h3>Start Publishing Today</h3>
            <p>
              Never stare at a blank page again. The Sovira Content AI is your personal, tireless copywriter, ready to scale your organic growth on demand.
            </p>
            <p>
              Create your account to test the generator, or check our <Link href="/pricing">pricing page</Link> to view word limits and unlock high-volume generation for your team.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
