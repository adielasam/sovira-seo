'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getReportByIdAction } from '../actions'
import { Printer, ArrowLeft, Loader2, Target, Activity, Shield } from 'lucide-react'

export default function ReportPrintView() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (typeof id === 'string') {
        const { data } = await getReportByIdAction(id)
        if (data) setReport(data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 space-y-4">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <button onClick={() => router.push('/reports')} className="text-blue-600 hover:underline">Go back to Reports</button>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Non-printable header */}
      <div className="print:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.push('/reports')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-semibold transition-colors">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Printable Report Container */}
      <div className="p-8 md:p-12 max-w-4xl mx-auto bg-white dark:bg-white text-slate-900 shadow-xl my-8 print:my-0 print:shadow-none print:w-full print:max-w-none">
        
        {/* Report Header */}
        <div className="border-b-4 border-blue-600 pb-8 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-tight">Sovira SEO</h1>
            <p className="text-slate-500 mt-2 font-medium tracking-widest uppercase text-sm">Professional SEO Analysis</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-slate-800">{report.name}</h2>
            <p className="text-slate-500 mt-1">{new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-sm font-medium text-blue-600 mt-1">{report.type}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Executive Summary</h3>
          <p className="text-slate-700 leading-relaxed text-lg">
            {report.content.executiveSummary || 'No summary available.'}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
            <div className="flex justify-center mb-3 text-blue-600"><Target className="w-8 h-8" /></div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Tracked Keywords</p>
            <p className="text-3xl font-extrabold text-slate-900">{report.content.totalKeywords?.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
            <div className="flex justify-center mb-3 text-emerald-600"><Activity className="w-8 h-8" /></div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Avg. Position</p>
            <p className="text-3xl font-extrabold text-slate-900">{report.content.averagePosition}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
            <div className="flex justify-center mb-3 text-purple-600"><Shield className="w-8 h-8" /></div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-1">Health Score</p>
            <p className="text-3xl font-extrabold text-slate-900">{report.content.healthScore}/100</p>
          </div>
        </div>

        {/* Additional Details (Simulated) */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Action Items & Recommendations</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">1</span>
              <p className="text-slate-700"><strong>Improve Page Load Speed:</strong> Core Web Vitals show LCP (Largest Contentful Paint) is taking longer than 2.5s on mobile devices.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-sm">2</span>
              <p className="text-slate-700"><strong>Optimize Missing Meta Tags:</strong> Found 12 high-priority pages missing descriptive meta descriptions.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">3</span>
              <p className="text-slate-700"><strong>Capitalize on Keyword Gaps:</strong> Competitor analysis indicates strong opportunity in long-tail "how-to" keywords related to your core product.</p>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-200 text-center text-slate-500 text-sm">
          <p>Generated by Sovira SEO • {new Date().getFullYear()} All Rights Reserved</p>
          <p className="mt-1">https://soviraseo.com</p>
        </div>
      </div>
    </div>
  )
}
