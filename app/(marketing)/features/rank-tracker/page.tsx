import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rank Tracker | Sovira AI',
  description: 'Monitor your organic search rankings with daily updates. Track keyword movements and stay ahead of your competitors.',
}

export default function RankTrackerPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Track Your Google Rankings with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Pinpoint Accuracy</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop manually searching Google to see where you rank. Monitor your critical keywords daily, track historical progress, and watch your organic visibility grow.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with Ranking Blind</h2>
            <p>
              SEO takes time, but how do you know if your efforts are actually working? If you aren't tracking your daily keyword positions, you're flying blind. Manual checks are wildly inaccurate due to personalized search results, and traditional tracking software charges exorbitant monthly fees just to track a handful of terms.
            </p>

            <h3>Automated Daily Monitoring</h3>
            <p>
              The Sovira Rank Tracker provides localized, unbiased data directly from search engine result pages. Add your target keywords, and our system will automatically ping Google every single day to record your exact position. No manual refreshes required.
            </p>

            <h3>Historical Trend Visualization</h3>
            <p>
              Search rankings are volatile. Instead of stressing over daily fluctuations, use our historical charts to view your ranking trajectory over weeks and months. Easily identify which pages are steadily climbing and which ones are beginning to decay, so you can intervene with content refreshes before you lose your traffic.
            </p>

            <h3>Competitor Surveillance</h3>
            <p>
              Don't just track yourself—track the enemy. Add competitor domains to your tracking list to see how you stack up against them for the same keywords. When they drop, you'll be the first to know, giving you the perfect opportunity to strike and claim their position.
            </p>

            <h3>Start Tracking for Free</h3>
            <p>
              We believe every creator and business should have access to basic rank tracking. That's why the Sovira Free tier includes daily tracking for your most vital keywords at zero cost.
            </p>
            <p>
              Create your account today and add your first keywords, or check our <Link href="/pricing">pricing page</Link> to see the expanded keyword limits available on our premium plans.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
