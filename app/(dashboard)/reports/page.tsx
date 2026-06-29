'use client'

import { useState, useEffect } from 'react'
import { FileText, FileDown, Plus, Mail, Calendar, Eye, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateReportAction, getReportsAction } from './actions'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setIsLoading(true)
    const { data } = await getReportsAction()
    if (data) setReports(data)
    setIsLoading(false)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    const types = ['Executive Summary', 'Keyword Rankings', 'Site Audit', 'Competitor Benchmark']
    const type = types[Math.floor(Math.random() * types.length)]
    const name = `${type} - ${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}`
    
    const { error, success, id, message } = await generateReportAction(type, name)
    
    if (error) {
      if (error === 'LIMIT_REACHED') {
        window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message } }))
      } else {
        toast.error(error)
      }
    } else if (success) {
      toast.success('Report generated successfully')
      await loadReports()
    }
    setIsGenerating(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Generate and view white-label SEO reports.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isGenerating ? 'Generating...' : 'New Report'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 shadow-lg text-white">
          <FileText className="w-8 h-8 mb-4 opacity-80" />
          <h3 className="text-lg font-bold mb-1">Scheduled Reports</h3>
          <p className="text-blue-100 text-sm mb-4">You have 2 reports scheduled to be sent automatically.</p>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm">
            Manage Schedule
          </button>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-center border-t-4 border-blue-500">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Next Weekly Digest</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Monday, 9:00 AM</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sending to 3 recipients</p>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-center border-t-4 border-purple-500">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="font-medium">Next Monthly Review</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">August 1st</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Executive Summary PDF</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]">
          <h3 className="font-semibold text-slate-900 dark:text-white">Recent Reports</h3>
        </div>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <table className="min-w-[600px] w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-white dark:bg-[#1E293B]">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Report Name</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Generated Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Size</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#1E293B]">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white flex items-center gap-3">
                      <div className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
                        <FileDown className="w-5 h-5" />
                      </div>
                      {report.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {report.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {report.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => router.push(`/reports/${report.id}`)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-end gap-1 ml-auto transition-colors"
                      >
                        <Eye className="w-4 h-4" /> View / Print
                      </button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No reports generated yet. Click "New Report" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

