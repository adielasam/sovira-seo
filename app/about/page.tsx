import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Sovira AI',
  description: 'Learn about the mission behind Sovira AI and our founder, Sam Ogide.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A101F] font-sans selection:bg-indigo-500/30">
      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-slate-50 dark:from-indigo-900/20 dark:via-[#0A101F] dark:to-[#0A101F] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
          <div className="mb-12">
            <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>

          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Mission</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Democratizing enterprise-grade SEO and AI tools for creators and businesses across Africa and beyond.
            </p>
          </div>

          <div className="bg-white dark:bg-[#111827] p-8 md:p-12 rounded-3xl shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden flex-shrink-0 ring-4 ring-indigo-50 dark:ring-indigo-900/30 shadow-2xl">
                <Image 
                  src="/images/sam-placeholder.jpg" 
                  alt="Sam Ogide" 
                  width={224} 
                  height={224}
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Sam Ogide</h2>
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold tracking-widest uppercase mb-6">
                  Founder, Sovira AI
                </p>
                <div className="relative">
                  <span className="absolute -top-4 -left-4 text-6xl text-indigo-100 dark:text-indigo-900/50 font-serif leading-none" aria-hidden="true">"</span>
                  <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 italic leading-relaxed relative z-10">
                    I built Sovira AI because I was tired of paying $99+/month for SEO tools that weren't built with African creators and small businesses in mind — from the pricing to the payment methods. Sovira is my answer to that. We are leveling the playing field.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-16 pt-12 border-t border-slate-100 dark:border-slate-800 prose prose-slate dark:prose-invert prose-lg max-w-none">
              <h3 className="text-2xl font-bold mb-4">Why We're Here</h3>
              <p>
                For too long, the digital marketing industry has been gated by expensive monthly subscriptions that shut out independent creators and small businesses. We believe that access to powerful, data-driven AI tools shouldn't be a luxury. 
              </p>
              <p>
                By combining technical SEO intelligence with generative AI, we've created a unified ecosystem that allows anyone to optimize their content, analyze complex data, and dominate search engine results without breaking the bank.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
