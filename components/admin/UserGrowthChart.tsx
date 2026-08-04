'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users } from 'lucide-react'

export function UserGrowthChart({ users }: { users: any[] }) {
  const chartData = useMemo(() => {
    const days = 30
    const countsByDate: Record<string, number> = {}

    // Initialize last 30 days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      countsByDate[dateStr] = 0
    }

    // Count signups
    users.forEach((u) => {
      if (u.created_at) {
        const dateStr = new Date(u.created_at).toISOString().split('T')[0]
        if (countsByDate[dateStr] !== undefined) {
          countsByDate[dateStr]++
        }
      }
    })

    // Calculate cumulative growth or just daily signups. Let's do Daily Signups
    return Object.keys(countsByDate).map((date) => {
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        signups: countsByDate[date],
      }
    })
  }, [users])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <Users className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">User Signups (30 Days)</h2>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                color: '#fff',
              }}
              itemStyle={{ fontSize: 12, color: '#60a5fa' }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="signups"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorSignups)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
