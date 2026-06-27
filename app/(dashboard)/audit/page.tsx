'use client'

import { useState, useEffect } from 'react'
import { Globe, Search, FileDown, CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import toast from 'react-hot-toast'

const steps = [
  "Crawling page structure...",
  "Analyzing meta tags & headings...",
  "Checking performance signals...",
  "Generating your report..."
]

export default function AuditPage() {
  const [url, setUrl] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const handleRunAudit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) {
      toast.error('Please enter a URL to audit')
      return
    }
    
    setIsAuditing(true)
    setShowResults(false)
    setCurrentStep(0)

    // Simulate 4 steps, 3 seconds each (Wait, 3 seconds each is 12 seconds total. Let's do 1.5s each so the user doesn't wait forever, but I'll stick to instructions "3 seconds each step")
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) {
        setCurrentStep(step)
      } else {
        clearInterval(interval)
        setIsAuditing(false)
        setShowResults(true)
        toast.success('Audit completed successfully!')
      }
    }, 3000)
  }

  const scoreData = [{ name: 'Score', value: 67, fill: '#EA580C' }] // Orange color for 67

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SEO Audit</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Run a comprehensive on-page SEO analysis.</p>
      </div>

      <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <form onSubmit={handleRunAudit} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isAuditing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAuditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Run Audit
          </button>
        </form>
      </div>

      {isAuditing && (
        <div className="bg-white dark:bg-[#1E293B] p-12 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{steps[currentStep]}</h2>
          <div className="flex gap-2 mt-4">
            {steps.map((_, i) => (
              <div key={i} className={`w-12 h-1.5 rounded-full transition-colors duration-500 ${i <= currentStep ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
            ))}
          </div>
        </div>
      )}

      {showResults && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Audit Results for {url}</h2>
            <button className="flex items-center gap-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
              <FileDown className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Gauge */}
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col items-center justify-center">
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Overall Score</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} data={scoreData} startAngle={180} endAngle={0}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-slate-900 dark:fill-white">
                      67
                    </text>
                    <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-sm font-medium fill-slate-500 dark:fill-slate-400">
                      /100
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-orange-600 dark:text-orange-400 font-medium mt-2">Needs Improvement</p>
            </div>

            {/* Check Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-orange-500">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Page Speed</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">72ms</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-green-500">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Meta Tags</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Good</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-red-500">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Headings</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">2 Issues</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-red-500">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Images</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">5 missing alt</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-green-500">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Mobile</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Passed</p>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 border-t-4 border-t-green-500">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">SSL</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">Active</p>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">Identified Issues</h3>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              <li className="p-4 sm:p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Critical</span>
                    <h4 className="font-medium text-slate-900 dark:text-white">Missing H1 tag</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">The page does not have an H1 tag. This is a critical ranking factor.</p>
                </div>
              </li>
              <li className="p-4 sm:p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Critical</span>
                    <h4 className="font-medium text-slate-900 dark:text-white">3 images without alt text</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Images missing alt attributes harm accessibility and image search rankings.</p>
                </div>
              </li>
              <li className="p-4 sm:p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Warning</span>
                    <h4 className="font-medium text-slate-900 dark:text-white">Meta description too short</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">The meta description is under 50 characters. Aim for 150-160 characters.</p>
                </div>
              </li>
              <li className="p-4 sm:p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Warning</span>
                    <h4 className="font-medium text-slate-900 dark:text-white">Page speed below 90</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Improve page load time by compressing large images and minifying JS/CSS.</p>
                </div>
              </li>
              <li className="p-4 sm:p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Info</span>
                    <h4 className="font-medium text-slate-900 dark:text-white">Consider adding schema markup</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Structured data helps search engines understand your content better and can trigger rich snippets.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
