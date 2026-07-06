import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { TrendingUp, BarChart, Search, Sparkles } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI SEO Tools - Scale Your Organic Growth | Sovira AI',
  description: 'Discover how Sovira AI\'s suite of advanced SEO tools can help you audit your site, discover high-value keywords, and dominate global search rankings.',
}

export default function SeoToolsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-blue-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50 dark:from-blue-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Advanced <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">SEO Tools</span> for Global Growth
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop guessing and start ranking. Sovira AI provides enterprise-grade SEO software designed for modern creators and marketers.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">Why You Need Dedicated SEO Tools Today</h2>
            <p>
              In today's highly competitive digital landscape, relying purely on great writing or engaging videos isn't enough to guarantee visibility. To capture organic traffic, you need powerful <Link href="/">SEO tools</Link> that can dissect search engine algorithms, reveal exactly what your target audience is searching for, and identify critical gaps in your competitors' strategies.
            </p>
            <p>
              Traditional SEO software is often bloated, incredibly expensive, and difficult to navigate. Sovira AI was built to solve this exact problem by democratizing access to high-end SEO capabilities. Whether you are an independent blogger, a growing agency, or an enterprise content team, our comprehensive suite of tools equips you with everything you need to scale your organic presence globally.
            </p>

            <h3>Comprehensive Keyword Research</h3>
            <p>
              The foundation of any successful organic campaign begins with keyword research. Our AI-driven keyword analysis tool dives deep into global search metrics, providing accurate search volumes, keyword difficulty scores, and historical trends. We don't just give you a list of words; we help you identify high-intent, low-competition opportunities that you can rank for quickly. By understanding user intent, you can align your content perfectly with what your audience actually wants.
            </p>

            <h3>Automated Technical SEO Audits</h3>
            <p>
              Even the best content will fail to rank if your website suffers from underlying technical issues. Sovira AI's site audit tool crawls your domain exactly like a search engine bot would. It immediately flags critical errors such as broken links, missing meta tags, slow page speeds, and mobile usability issues. More importantly, our AI doesn't just show you the errors—it provides clear, actionable steps on how to fix them, acting as your technical SEO co-pilot.
            </p>

            <h3>Intelligent Competitor Tracking</h3>
            <p>
              If you aren't monitoring your competitors, you are leaving traffic on the table. Our competitor analysis module allows you to reverse-engineer the success of top-ranking domains in your niche. Discover which keywords are driving their traffic, analyze their backlink profiles, and uncover content gaps. By understanding exactly what works for them, you can create a superior strategy that eventually outranks them.
            </p>

            <h3>Beyond Traditional Search</h3>
            <p>
              Search engine optimization is no longer limited to just Google. If you are producing video content, you absolutely must optimize for the second largest search engine in the world. Learn more about how our platform also functions as a powerful <Link href="/youtube-seo-tools">YouTube SEO tool</Link>, helping video creators maximize their reach, click-through rates, and overall watch time through intelligent metadata optimization.
            </p>

            <h3>Ready to Dominate the SERPs?</h3>
            <p>
              It's time to stop leaving your organic traffic to chance. With Sovira AI, you have a complete, AI-powered toolkit ready to elevate your search engine rankings. From ideation to execution and tracking, we provide the infrastructure for your success. Check out our <Link href="/pricing">affordable pricing plans</Link> today and start your risk-free trial to see the difference for yourself.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
