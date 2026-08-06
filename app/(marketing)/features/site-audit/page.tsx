import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Site Audit | Sovira AI',
  description: 'Run comprehensive technical SEO audits in minutes with AI. Discover and fix broken links, missing tags, and indexability issues.',
}

export default function SiteAuditPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Find and Fix Technical SEO Issues with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">AI Precision</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Stop guessing why your site isn't ranking. Run a complete technical SEO audit in minutes and get prioritized, plain-English instructions on how to fix every error.
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-lg max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <h2 className="mt-0">The Problem with Traditional Audits</h2>
            <p>
              Most SEO audit tools crawl your site and dump a terrifying spreadsheet of 10,000 "errors" on your lap. They tell you that you have a canonicalization issue, but they don't tell you if it actually matters or how to fix it on your specific CMS. For businesses and creators, this data overload leads to paralysis.
            </p>

            <h3>Intelligent Prioritization</h3>
            <p>
              The Sovira AI Site Audit doesn't just find issues; it understands their context. Our engine categorizes errors into Critical, Warning, and Notice tiers. We analyze your broken links, missing meta descriptions, slow page speeds, and indexability issues, and present only the highest-impact fixes that will actually move the needle for your search visibility.
            </p>

            <h3>Actionable "How-to-Fix" Explanations</h3>
            <p>
              Instead of generic error codes, every issue discovered by our crawler comes with an AI-generated explanation of why it matters and a step-by-step guide on how to fix it. We translate complex technical SEO jargon into plain English so you or your developer can deploy fixes immediately.
            </p>

            <h3>White-Labeled Client Reports</h3>
            <p>
              Are you an agency or freelancer? Run audits on your clients' domains and instantly export the findings into a clean, professional, white-labeled report. It's the ultimate tool for winning pitches and demonstrating value before you even sign a contract.
            </p>

            <h3>Stop Leaking Traffic</h3>
            <p>
              Technical SEO is the foundation of organic growth. If search engines can't properly crawl or understand your site, your great content won't save you.
            </p>
            <p>
              Sign up today and run your first technical audit completely free. Check our <Link href="/pricing">pricing page</Link> to view crawl limits per plan.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
