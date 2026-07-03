import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { Footer } from '@/components/marketing/Footer'

export const metadata = {
  title: 'Terms of Service | Sovira SEO',
  description: 'Terms of Service for Sovira SEO platform.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-blue-500/30">
      
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0A101F]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-transform group-hover:scale-105">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sovira SEO
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/pricing" className="hidden sm:flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20 active:scale-95">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Soft gradient background matching brand color */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-slate-50 to-slate-50 dark:from-blue-900/20 dark:via-[#0A101F] dark:to-[#0A101F]" />
        
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl mb-6">
            Terms of Service
          </h1>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Last updated: July 3, 2026
          </p>
        </div>
      </div>

      {/* ── Content Card ── */}
      <div className="relative z-20 mx-auto max-w-4xl px-6 pb-24 lg:px-8 -mt-8 lg:-mt-16">
        <div className="rounded-3xl bg-white dark:bg-[#111827] px-6 py-10 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-slate-800 sm:px-12 sm:py-16">
          
          <div className="prose prose-slate dark:prose-invert prose-blue max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500 leading-relaxed">
            
            <p className="lead text-lg md:text-xl text-slate-600 dark:text-slate-300 font-medium mb-10">
              By accessing or using Sovira SEO, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
            </p>

            <div className="bg-blue-50/80 dark:bg-blue-900/10 border-l-4 border-blue-600 dark:border-blue-500 p-6 md:p-8 rounded-r-2xl my-10">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-0 mb-3">Legal Disclaimer</h3>
              <p className="text-blue-800 dark:text-blue-200 mb-0">
                Sovira SEO is an AI-assisted tool that helps you research, audit, and optimize content for search and video platforms. We do not guarantee specific rankings, traffic increases, revenue outcomes, or monetization approval on any third-party platform. AI-generated output may occasionally be inaccurate or incomplete. You are responsible for reviewing and fact-checking all content before publishing it.
              </p>
            </div>

            <h2>1. Acceptance of Terms</h2>
            <p>
              Using Sovira SEO in any way means you accept these Terms in full. If any part of these Terms is unacceptable to you, you must stop using the service.
            </p>

            <h2>2. Your Content, Your Rights</h2>
            <p>
              You retain full ownership of the audits, keyword strategies, content drafts, and other output generated through your use of Sovira SEO. You're free to use this output commercially — on YouTube, websites, social platforms, or anywhere else you publish.
            </p>

            <h2>3. AI Usage and Limitations</h2>
            <p>
              Sovira relies on third-party AI and data infrastructure to power its features. You agree to use the platform in a way that respects the acceptable-use policies of these underlying providers. AI-generated output is provided "as is" — it may occasionally contain errors, outdated information, or inaccuracies specific to your market or niche, and should be reviewed before you rely on it.
            </p>

            <h2>4. Subscriptions and Billing</h2>
            <p>
              Subscriptions are billed in advance on a recurring basis via Paystack or Stripe. You can cancel anytime from your dashboard; cancellation stops future billing but does not refund the current billing period. Because platform usage draws on real-time compute and data costs the moment you use a feature, all sales are final — we do not issue refunds for credits or usage already consumed.
            </p>

            <h2>5. Prohibited Conduct</h2>
            <p>
              You may not use Sovira SEO to generate or publish content that is illegal, infringes on someone else's intellectual property, or is intended to deceive, spam, or manipulate search/platform algorithms in ways that violate those platforms' own policies. Attempting to circumvent usage limits, share account access in violation of your plan, or abuse the platform in any way may result in immediate suspension or termination of your account, without refund.
            </p>

            <h2>6. Service Availability</h2>
            <p>
              We aim to keep Sovira SEO available and reliable, but we don't guarantee uninterrupted access. Features that depend on third-party APIs (search data, AI generation, page-speed audits, etc.) may be temporarily limited if those providers experience outages.
            </p>

            <h2>7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Sovira SEO and Dorvas Technologies are not liable for any direct, indirect, incidental, or consequential damages arising from your use of, or inability to use, the platform — including lost revenue, lost rankings, or the suspension or termination of any account on a third-party platform (e.g., YouTube, a client's website, an ad account).
            </p>

            <h2>8. Changes to These Terms</h2>
            <p>
              We may update these Terms as the platform evolves. Continued use after changes are posted means you accept the revised Terms.
            </p>

            <h2>9. Contact Us</h2>
            <p>
              Questions about these Terms? Reach us via WhatsApp at <strong>+234 816 233 7303</strong>.
            </p>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
