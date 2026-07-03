import Link from 'next/link'
import { Shield } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | Sovira SEO',
  description: 'Terms of Service for Sovira SEO platform.',
}

export default function TermsPage() {
  return (
    <div className="bg-slate-50 dark:bg-[#0F172A] min-h-screen py-16 md:py-24 transition-colors duration-300">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mb-8 group">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Sovira SEO</span>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Last updated: July 3, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert prose-blue max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500 bg-white dark:bg-[#1E293B] p-8 md:p-12 rounded-3xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          
          <p className="lead">
            By accessing or using Sovira SEO, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 dark:border-blue-500 p-6 rounded-r-2xl my-8">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-0 mb-2">Legal Disclaimer</h3>
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
            Sovira relies on third-party AI and data infrastructure to power its features. You agree to use the platform in a way that respects the acceptable-use policies of these underlying providers. AI-generated output is provided &quot;as is&quot; — it may occasionally contain errors, outdated information, or inaccuracies specific to your market or niche, and should be reviewed before you rely on it.
          </p>

          <h2>4. Subscriptions and Billing</h2>
          <p>
            Subscriptions are billed in advance on a recurring basis via Paystack or Stripe. You can cancel anytime from your dashboard; cancellation stops future billing but does not refund the current billing period. Because platform usage draws on real-time compute and data costs the moment you use a feature, all sales are final — we do not issue refunds for credits or usage already consumed.
          </p>

          <h2>5. Prohibited Conduct</h2>
          <p>
            You may not use Sovira SEO to generate or publish content that is illegal, infringes on someone else&apos;s intellectual property, or is intended to deceive, spam, or manipulate search/platform algorithms in ways that violate those platforms&apos; own policies. Attempting to circumvent usage limits, share account access in violation of your plan, or abuse the platform in any way may result in immediate suspension or termination of your account, without refund.
          </p>

          <h2>6. Service Availability</h2>
          <p>
            We aim to keep Sovira SEO available and reliable, but we don&apos;t guarantee uninterrupted access. Features that depend on third-party APIs (search data, AI generation, page-speed audits, etc.) may be temporarily limited if those providers experience outages.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Sovira SEO and Dorvas Technologies are not liable for any direct, indirect, incidental, or consequential damages arising from your use of, or inability to use, the platform — including lost revenue, lost rankings, or the suspension or termination of any account on a third-party platform (e.g., YouTube, a client&apos;s website, an ad account).
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
  )
}
