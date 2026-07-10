import { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { CheckCircle2, MapPin, Facebook, Youtube, Linkedin, Instagram } from 'lucide-react'
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
              <Facebook className="w-6 h-6" />
              <span className="font-medium hidden sm:inline">Facebook</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors">
              <Youtube className="w-6 h-6" />
              <span className="font-medium hidden sm:inline">YouTube</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-blue-700 transition-colors">
              <Linkedin className="w-6 h-6" />
              <span className="font-medium hidden sm:inline">LinkedIn</span>
            </Link>
            <Link href="#" className="flex items-center gap-2 text-slate-500 hover:text-pink-600 transition-colors">
              <Instagram className="w-6 h-6" />
              <span className="font-medium hidden sm:inline">Instagram</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
