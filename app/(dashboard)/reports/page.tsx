'use client'

import { useState, useEffect } from 'react'
import { FileText, FileDown, Plus, Mail, Calendar, Eye, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateReportAction, getReportsAction, getReportSchedulesAction, saveReportScheduleAction } from './actions'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  // Modal State
  const [scheduleType, setScheduleType] = useState('Executive Summary')
  const [scheduleFreq, setScheduleFreq] = useState('Weekly')
  const [scheduleEmails, setScheduleEmails] = useState('')
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    const [reportsRes, schedulesRes] = await Promise.all([
      getReportsAction(),
      getReportSchedulesAction()
    ])
    if (reportsRes.data) setReports(reportsRes.data)
    if (schedulesRes.data) setSchedules(schedulesRes.data)
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
      await loadData()
    }
    setIsGenerating(false)
  }

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSchedule(true)
    const { error, success } = await saveReportScheduleAction({
      frequency: scheduleFreq,
      emails: scheduleEmails,
      type: scheduleType
    })
    
    if (error) {
      toast.error(error)
    } else if (success) {
      toast.success('Schedule saved successfully!')
      setIsModalOpen(false)
      await loadData()
    }
    setIsSavingSchedule(false)
  }

  const weeklySchedule = schedules.find(s => s.frequency === 'Weekly')
  const monthlySchedule = schedules.find(s => s.frequency === 'Monthly')

  return (
    <div className="space-y-8 relative">
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
          <p className="text-blue-100 text-sm mb-4">You have {schedules.length} active automated report schedules.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
          >
            Manage Schedule
          </button>
        </div>
        
        {weeklySchedule ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-center border-t-4 border-blue-500">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
              <Mail className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Active Weekly Digest</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-1 truncate">{weeklySchedule.type}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">To: {weeklySchedule.emails}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-center border-t-4 border-slate-300 dark:border-slate-700 opacity-60">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
              <Mail className="w-5 h-5" />
              <span className="font-medium">Weekly Digest</span>
            </div>
            <p className="text-xl font-bold text-slate-500 dark:text-slate-500 mb-1">Not Configured</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Click Manage Schedule to set up</p>
          </div>
        )}

        {monthlySchedule ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-center border-t-4 border-purple-500">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Active Monthly Review</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-1 truncate">{monthlySchedule.type}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">To: {monthlySchedule.emails}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 flex flex-col justify-center border-t-4 border-slate-300 dark:border-slate-700 opacity-60">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Monthly Review</span>
            </div>
            <p className="text-xl font-bold text-slate-500 dark:text-slate-500 mb-1">Not Configured</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Click Manage Schedule to set up</p>
          </div>
        )}
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

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Automated Schedule</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSchedule} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Delivery Frequency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScheduleFreq('Weekly')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                      scheduleFreq === 'Weekly' 
                        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 dark:bg-[#0F172A] dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFreq('Monthly')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                      scheduleFreq === 'Monthly' 
                        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 dark:bg-[#0F172A] dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Report Type
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option>Executive Summary</option>
                  <option>Keyword Rankings</option>
                  <option>Technical Site Audit</option>
                  <option>Competitor Benchmark</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Emails (comma separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="client@example.com, team@example.com"
                  value={scheduleEmails}
                  onChange={(e) => setScheduleEmails(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSavingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

