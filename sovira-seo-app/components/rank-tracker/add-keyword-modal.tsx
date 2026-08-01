import { useState } from 'react'
import { X, Loader2, Globe, Target, Hash, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddKeywordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newKeyword: any) => void
}

export function AddKeywordModal({ isOpen, onClose, onSuccess }: AddKeywordModalProps) {
  const [keyword, setKeyword] = useState('')
  const [projectDomain, setProjectDomain] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [searchVolume, setSearchVolume] = useState('')
  const [countryCode, setCountryCode] = useState('us')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword || !projectDomain) {
      return toast.error('Keyword and Project Domain are required')
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/rank-tracker/add-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          projectDomain,
          targetUrl,
          searchVolume,
          countryCode
        })
      })
      const data = await res.json()
      
      if (!res.ok) {
        if (data.error === 'LIMIT_REACHED') {
          onClose()
          window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { message: data.message } }))
          return
        }
        throw new Error(data.message || data.error)
      }

      toast.success('Keyword added and checked!')
      
      // Update UI with the initial rank checking result
      const newKw = {
        ...data.data,
        currentRank: data.initialRank,
        change: 0,
        history: [{ date: new Date().toISOString(), rank: data.initialRank }]
      }
      
      onSuccess(newKw)
      
      // Reset form
      setKeyword('')
      setTargetUrl('')
      setSearchVolume('')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Track New Keyword</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keyword <span className="text-red-500">*</span></label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. best seo tools"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Project Domain <span className="text-red-500">*</span></label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                value={projectDomain}
                onChange={(e) => setProjectDomain(e.target.value)}
                placeholder="e.g. sovira.com"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
            <p className="text-xs text-slate-500">We will search for this domain in the organic results.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target URL <span className="text-slate-400 font-normal">(Optional)</span></label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="url" 
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://sovira.com/best-seo-tools"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Country</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white appearance-none"
                >
                  <option value="us">United States (US)</option>
                  <option value="gb">United Kingdom (GB)</option>
                  <option value="ca">Canada (CA)</option>
                  <option value="au">Australia (AU)</option>
                  <option value="in">India (IN)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Search Vol. <span className="text-slate-400 font-normal">(Opt)</span></label>
              <input 
                type="text" 
                value={searchVolume}
                onChange={(e) => setSearchVolume(e.target.value)}
                placeholder="e.g. 15,000"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition-all shadow-sm disabled:opacity-70 mt-4"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isSubmitting ? 'Checking Rank...' : 'Add & Track Keyword'}
          </button>
        </form>
      </div>
    </div>
  )
}
