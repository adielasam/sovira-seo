import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Data Analyzer | Sovira AI',
  description: 'Upload any CSV or Excel file and instantly get a clean, intelligent dashboard. Let our AI do the heavy lifting of sorting, cleaning, and visualizing your business data.',
}

export default function DataAnalyzerPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-blue-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50 dark:from-blue-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Transform Raw Data into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">Actionable Intelligence</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop drowning in spreadsheets. Our AI-driven Data Analyzer automatically parses your performance metrics, identifies hidden traffic opportunities, and tells you exactly what to optimize next.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with Raw Data</h2>
            <p>
              In today's fast-paced environment, the problem is rarely a lack of data. In fact, most teams suffer from data overload. You export massive spreadsheets from various platforms and then stare at thousands of rows wondering, "What do I actually <em>do</em> with this?" You don't have hours to spend writing complex formulas or building pivot tables just to make sense of your business metrics.
            </p>

            <h3>Intelligent Dashboards in Seconds</h3>
            <p>
              Our Data Analyzer solves this by letting you simply upload any CSV or Excel file. Within seconds, our AI automatically cleans the data, structures it, and builds a comprehensive executive dashboard complete with beautiful visualizations. There is absolutely no manual sorting, formatting, or spreadsheet wizardry required.
            </p>

            <h3>Built for Local Business Context</h3>
            <p>
              Unlike generic global tools that struggle with localized formatting, Sovira's Data Analyzer is built to seamlessly handle the Nigerian business context. It automatically detects and accurately formats local currencies like ₦ (NGN), ensuring your financial dashboards and ad spend reports reflect the real metrics you care about without throwing validation errors.
            </p>

            <h3>One Tool, Any Spreadsheet</h3>
            <p>
              The power of the AI Data Analyzer is its flexibility. Upload your Search Console export, your latest ad spend report, or even your raw sales spreadsheet—you'll get a clean, actionable dashboard back in seconds. It positions your data perfectly for high-level decision making, whether you're optimizing SEO campaigns or reviewing quarterly revenue.
            </p>

            <h3>Ready to Make Data-Driven Decisions?</h3>
            <p>
              Stop guessing and let our Data Analyzer act as your dedicated data scientist. Reclaim your time, ditch the overwhelming spreadsheets, and start making decisions based on clear, visual insights. Head over to our <Link href="/pricing">pricing page</Link> to start your risk-free trial today.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
