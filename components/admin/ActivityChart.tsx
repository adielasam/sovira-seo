'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Activity } from 'lucide-react'

type LogEntry = {
  id: string
  created_at: string
  action: string
  user_id: string
}

export function ActivityChart({ logs }: { logs: LogEntry[] }) {
  const [days, setDays] = useState(7)

  const chartData = useMemo(() => {
    // Group by date (YYYY-MM-DD)
    const countsByDate: Record<string, Record<string, number>> = {}
    const actionsSet = new Set<string>()

    // Initialize the last N days with 0 counts
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      countsByDate[dateStr] = {}
    }

    // Process logs
    logs.forEach((log) => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0]
      if (countsByDate[dateStr]) {
        const action = log.action || 'Unknown'
        actionsSet.add(action)
        countsByDate[dateStr][action] = (countsByDate[dateStr][action] || 0) + 1
      }
    })

    // Format for recharts
    return Object.keys(countsByDate).map((date) => {
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const dataPoint: any = { date: formattedDate, fullDate: date }
      Object.entries(countsByDate[date]).forEach(([action, count]) => {
        dataPoint[action] = count
      })
      return dataPoint
    })
  }, [logs, days])

  const chartColors = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1'
  ]

  // Extract unique actions to create bars
  const allActions = Array.from(
    new Set(
      logs.map((log) => log.action).filter(Boolean)
    )
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          Activity Trends
        </h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last 30 Days</option>
        </select>
      </div>

      <div className="h-[300px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                itemStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {allActions.map((action, index) => (
                <Bar
                  key={action}
                  dataKey={action}
                  stackId="a"
                  fill={chartColors[index % chartColors.length]}
                  radius={index === allActions.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            No activity data available for the selected period.
          </div>
        )}
      </div>
    </div>
  )
}
