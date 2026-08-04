'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Crown } from 'lucide-react'

export function PlanDistributionChart({ users }: { users: any[] }) {
  const chartData = useMemo(() => {
    const plans: Record<string, number> = {
      Free: 0,
      Starter: 0,
      Pro: 0,
      Agency: 0,
    }

    users.forEach((u) => {
      // Normalize plan names
      const plan = u.plan ? u.plan.toLowerCase() : 'free'
      if (plan.includes('trial')) plans['Free']++
      else if (plan === 'starter') plans['Starter']++
      else if (plan === 'pro') plans['Pro']++
      else if (plan === 'agency') plans['Agency']++
      else plans['Free']++
    })

    return Object.entries(plans)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }))
  }, [users])

  const COLORS = {
    Free: '#94a3b8',
    Starter: '#3b82f6',
    Pro: '#10b981',
    Agency: '#8b5cf6',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <Crown className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Plan Distribution</h2>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'} 
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                itemStyle={{ fontSize: 13, fontWeight: 'bold' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            No user data available.
          </div>
        )}
      </div>
    </div>
  )
}
