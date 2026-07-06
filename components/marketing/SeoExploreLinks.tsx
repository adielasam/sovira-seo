import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'

export function SeoExploreLinks() {
  const links = [
    {
      title: "SEO Tools",
      description: "Discover our full suite of enterprise-grade search optimization software.",
      href: "/seo-tools",
    },
    {
      title: "YouTube SEO Tools",
      description: "Hack the YouTube algorithm, rank your videos higher, and get more views.",
      href: "/youtube-seo-tools",
    },
    {
      title: "Content Creation Tools",
      description: "Generate highly optimized, long-form articles in seconds using our AI.",
      href: "/content-creation-tools",
    },
  ]

  return (
    <section className="py-16 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explore Sovira AI Solutions</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className="group p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg transition-all"
            >
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                {link.title}
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
