'use client'

import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <Link href="/" className="flex items-center gap-2 mb-6 group">
            <span className="bg-blue-600 rounded-lg p-2 transition-transform group-hover:scale-105">
              <TrendingUp className="w-6 h-6 text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight">Sovira SEO</span>
          </Link>
          <p className="text-base text-slate-400 max-w-md leading-relaxed">
            The premium ecosystem for professional marketers. High-converting audits, semantic SEO research, and localized rank tracking.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Product</h3>
          <ul className="space-y-4 text-base text-slate-400">
            <li><Link href="/#features" className="hover:text-blue-400 transition-colors">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-blue-400 transition-colors">Pricing</Link></li>
            <li><Link href="/integrations" className="hover:text-blue-400 transition-colors">Integrations</Link></li>
            <li><Link href="/changelog" className="hover:text-blue-400 transition-colors">Changelog</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Company</h3>
          <ul className="space-y-4 text-base text-slate-400">
            <li><Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link></li>
            <li><Link href="/careers" className="hover:text-blue-400 transition-colors">Careers</Link></li>
            <li><a href="https://wa.me/2348162337303" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Contact</a></li>
            <li><Link href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-16 pt-8 border-t border-slate-800 text-slate-500 flex flex-col md:flex-row justify-between items-center gap-6">
        <p>© {new Date().getFullYear()} Sovira SEO (Dorvas Technologies). All rights reserved.</p>
        <div className="flex space-x-6">
          <a href={process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/dorvastechnologies/"} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#1877F2] transition-colors p-2 bg-slate-800 rounded-full hover:bg-white" aria-label="Facebook">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
            </svg>
          </a>
          <a href={process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/in/samogide/"} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#0A66C2] transition-colors p-2 bg-slate-800 rounded-full hover:bg-white" aria-label="LinkedIn">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
            </svg>
          </a>
          <a href={process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://www.youtube.com/@samgoldtales"} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-[#FF0000] transition-colors p-2 bg-slate-800 rounded-full hover:bg-white" aria-label="YouTube">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.498 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.498-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}
