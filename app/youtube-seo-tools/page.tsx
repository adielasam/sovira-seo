import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'YouTube SEO Tools - Maximize Video Views | Sovira AI',
  description: 'Optimize your YouTube channel with Sovira AI. Discover top-ranking video keywords, generate optimized titles, and explode your subscriber growth.',
}

export default function YouTubeSeoToolsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-blue-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-100/40 via-slate-50 to-slate-50 dark:from-red-900/10 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">YouTube SEO Tools</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop making videos that nobody watches. Let our AI optimize your titles, descriptions, and tags to hack the YouTube algorithm and drive massive organic views.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-red-600 dark:prose-a:text-red-400 hover:prose-a:text-red-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">Hacking the YouTube Algorithm</h2>
            <p>
              Creating high-quality, engaging videos takes immense time and effort. It is devastating to spend days editing a masterpiece only for it to receive a handful of views. YouTube is the second largest search engine globally, which means treating your video strategy purely as social media is a critical mistake. You need dedicated <strong>YouTube SEO tools</strong> to ensure your content is surfaced to the right viewers exactly when they are searching for it.
            </p>
            <p>
              Sovira AI is fully equipped to serve as your ultimate video growth companion. We help creators from all over the world understand search intent, optimize metadata, and construct video concepts that are practically guaranteed to generate clicks and prolonged watch time.
            </p>

            <h3>Mastering Video Keyword Research</h3>
            <p>
              The secret to explosive channel growth isn't just viral trends; it's evergreen search traffic. Our specialized video keyword engine helps you uncover terms that have high monthly search volumes on YouTube but critically low competition. Instead of guessing what titles will perform well, our platform provides data-backed recommendations. We analyze autocomplete suggestions, related searches, and competitor channel tags to build a foolproof keyword strategy for your next upload.
            </p>

            <h3>AI-Optimized Titles and Descriptions</h3>
            <p>
              Your title and thumbnail get the click, but your description helps the algorithm categorize and recommend your video. Writing perfectly optimized, 500-word descriptions manually for every upload is tedious. Sovira AI acts as your personal <Link href="/content-creation-tools">content creation tool</Link>, instantly generating highly optimized, natural-sounding YouTube descriptions. It automatically naturally weaves in your primary and secondary keywords, includes structured timestamps (chapters), and formats your social links for maximum engagement.
            </p>

            <h3>Competitor Channel Analysis</h3>
            <p>
              Do you know exactly why your competitor's video ranks #1 while yours is stuck on page 3? Our platform allows you to peer behind the curtain of any successful YouTube channel. You can extract their exact tag structures, analyze their historical upload frequency, and see the exact keywords driving their channel's growth. Armed with this intelligence, you can craft a content calendar that directly attacks their weaknesses and captures their audience.
            </p>

            <h3>Start Growing Your Channel Today</h3>
            <p>
              Whether you are a gaming creator, an educational channel, or a global brand, ranking on YouTube requires precision. Sovira AI provides all the intelligent insights you need to dominate the search results and suggested video feeds. If you are ready to take your channel seriously and turn your views into a predictable engine, explore our <Link href="/pricing">creator-friendly pricing</Link> or head back to the <Link href="/">main homepage</Link> to see the full capabilities of our AI suite.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
