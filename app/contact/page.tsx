import { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { CheckCircle2, MapPin } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact Us | Sovira SEO',
  description: 'Get in touch with Sovira SEO today. Learn more about our exclusive features, use cases, or schedule a demo tour of our AI-powered application.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0F172A] transition-colors duration-300">
      <Navbar />

      <main className="flex-1 w-full mt-20 relative overflow-hidden">
        {/* Gradient Background matches the vibrant look from the reference */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-white dark:from-indigo-950/20 dark:via-purple-900/10 dark:to-[#0F172A] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Content */}
          <div className="space-y-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Let's get in touch today with Sovira.
            </h1>

            <ul className="space-y-6 text-lg sm:text-xl text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-4">
                <CheckCircle2 className="text-blue-600 dark:text-blue-400 w-6 h-6 flex-shrink-0" />
                <span>Know more about exclusive Sovira features</span>
              </li>
              <li className="flex items-center gap-4">
                <CheckCircle2 className="text-blue-600 dark:text-blue-400 w-6 h-6 flex-shrink-0" />
                <span>Know more about the use cases</span>
              </li>
              <li className="flex items-center gap-4">
                <CheckCircle2 className="text-blue-600 dark:text-blue-400 w-6 h-6 flex-shrink-0" />
                <span>Demo tour of the application</span>
              </li>
            </ul>

            <div className="flex items-start gap-4 text-slate-600 dark:text-slate-400 pt-6">
              <MapPin className="w-6 h-6 mt-1 flex-shrink-0" />
              <p className="text-lg">
                123 Innovation Drive,<br />
                Tech Hub City, 10001
              </p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 sm:p-10 border border-slate-100 dark:border-slate-800 relative z-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
              Fill in this form to raise your query!
            </h2>

            {/* Replace the action URL with your actual formsubmit.co email */}
            <form action="https://formsubmit.co/your@email.com" method="POST" className="space-y-6">
              {/* Optional: Add hidden fields for formsubmit.co configuration */}
              <input type="hidden" name="_subject" value="New Contact Form Submission from Sovira" />
              <input type="hidden" name="_captcha" value="true" />
              <input type="hidden" name="_template" value="table" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                ></textarea>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                By clicking "Submit", I agree to Sovira's TOS and Privacy Policy.
              </p>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all focus:ring-4 focus:ring-blue-600/50"
              >
                Submit
              </button>
            </form>
          </div>
        </div>

        {/* Social Links Section at bottom */}
        <div className="max-w-4xl mx-auto px-4 pb-16 text-center space-y-8">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Generate content. Stay consistent.
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              <span className="font-medium hidden sm:inline">Facebook</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.498 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.498-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" clipRule="evenodd" /></svg>
              <span className="font-medium hidden sm:inline">YouTube</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
              <span className="font-medium hidden sm:inline">LinkedIn</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-pink-600 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" clipRule="evenodd" /></svg>
              <span className="font-medium hidden sm:inline">Instagram</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
