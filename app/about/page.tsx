import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">About Sovira SEO</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          We are on a mission to democratize enterprise-grade SEO tools for everyone. 
          Our story is just beginning—check back soon for the full scoop on our team and vision!
        </p>
        <div className="pt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
