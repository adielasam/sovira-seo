export type ColumnType = 'numeric' | 'date' | 'currency' | 'categorical' | 'unknown'

export interface ColumnMeta {
  key: string
  type: ColumnType
}

export function generateDatasetSummary(data: any[], columnMeta: ColumnMeta[]) {
  if (!data || data.length === 0) return null

  // 1. Identify key columns
  const currencyCols = columnMeta.filter(c => c.type === 'currency' || (c.type === 'numeric' && /(revenue|sales|price|amount)/i.test(c.key)))
  const costCols = columnMeta.filter(c => (c.type === 'numeric' || c.type === 'currency') && /(cost|expense|spend)/i.test(c.key))
  const dateCols = columnMeta.filter(c => c.type === 'date' || /(date|time|month|year)/i.test(c.key))
  const categoricalCols = columnMeta.filter(c => c.type === 'categorical' && /(region|country|location|city|state|category|segment|type)/i.test(c.key))

  const primaryRevenueCol = currencyCols[0]?.key
  const primaryCostCol = costCols[0]?.key
  const primaryDateCol = dateCols[0]?.key
  const primaryCategoryCol = categoricalCols[0]?.key

  // Aggregates
  let totalRevenue = 0
  let totalCost = 0
  let netProfit = 0
  let profitMargin = 0
  let periodGrowth: number | null = null
  let regionalBreakdown: Record<string, number> = {}

  // Basic totals
  data.forEach(row => {
    if (primaryRevenueCol) {
      const val = parseFloat(String(row[primaryRevenueCol]).replace(/[^0-9.-]+/g, ""))
      if (!isNaN(val)) totalRevenue += val
    }
    if (primaryCostCol) {
      const val = parseFloat(String(row[primaryCostCol]).replace(/[^0-9.-]+/g, ""))
      if (!isNaN(val)) totalCost += val
    }
    
    // Regional/Category grouping for revenue
    if (primaryCategoryCol && primaryRevenueCol) {
      const cat = String(row[primaryCategoryCol] || 'Unknown').trim()
      const val = parseFloat(String(row[primaryRevenueCol]).replace(/[^0-9.-]+/g, ""))
      if (!isNaN(val)) {
        regionalBreakdown[cat] = (regionalBreakdown[cat] || 0) + val
      }
    }
  })

  // Profitability
  if (primaryRevenueCol && primaryCostCol) {
    netProfit = totalRevenue - totalCost
    if (totalRevenue > 0) {
      profitMargin = (netProfit / totalRevenue) * 100
    }
  }

  // Period-over-period growth
  if (primaryDateCol && primaryRevenueCol) {
    // Extract valid dates and sort
    const dateValues = data
      .map(r => ({
        date: new Date(r[primaryDateCol]),
        val: parseFloat(String(r[primaryRevenueCol]).replace(/[^0-9.-]+/g, ""))
      }))
      .filter(x => !isNaN(x.date.getTime()) && !isNaN(x.val))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (dateValues.length > 0) {
      const minDate = dateValues[0].date
      const maxDate = dateValues[dateValues.length - 1].date
      const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)

      // Guard: If date range is too short (< 14 days) or too few samples (< 4), return null for growth
      if (diffDays >= 14 && dateValues.length >= 4) {
        const midPoint = minDate.getTime() + (maxDate.getTime() - minDate.getTime()) / 2
        
        let firstHalfTotal = 0
        let secondHalfTotal = 0

        dateValues.forEach(x => {
          if (x.date.getTime() < midPoint) firstHalfTotal += x.val
          else secondHalfTotal += x.val
        })

        if (firstHalfTotal > 0) {
          periodGrowth = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        }
      }
    }
  }

  // Sort and cap regional breakdown to top 5
  const topRegions = Object.entries(regionalBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

  return {
    meta: {
      totalRows: data.length,
      columns: columnMeta,
      detectedRoles: {
        revenueColumn: primaryRevenueCol || null,
        costColumn: primaryCostCol || null,
        dateColumn: primaryDateCol || null,
        categoryColumn: primaryCategoryCol || null
      }
    },
    aggregates: {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      periodGrowth,
      topSegments: Object.keys(topRegions).length > 0 ? topRegions : null
    },
    sampleData: data.slice(0, 3)
  }
}
