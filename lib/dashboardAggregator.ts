import * as aq from 'arquero';
import { PipelineResult, ColumnType } from './dataPipeline';

export interface KPI {
  title: string;
  value: number | string;
  format: 'currency' | 'number' | 'percent' | 'text';
  type: 'total' | 'top-value';
  badgePercentage: number;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie';
  dataKey: string;
  categoryKey: string;
  data: any[];
}

export interface AggregatedDashboardData {
  kpis: KPI[];
  charts: ChartConfig[];
  dataQualityBadge: number; // 0 to 100
  lowDataQuality: boolean; // True if data quality < 20%
  aiInsightContext: any; // The payload to send to AI
}

// Helper to check if a column name matches common business terms
function getBusinessWeight(colName: string): number {
  const lower = colName.toLowerCase();
  const highPriority = ['revenue', 'sales', 'amount', 'profit', 'cost', 'spend', 'budget', 'price', 'expense'];
  const medPriority = ['region', 'category', 'department', 'status', 'month', 'year', 'date', 'customer'];
  
  if (highPriority.some(term => lower.includes(term))) return 3;
  if (medPriority.some(term => lower.includes(term))) return 1.5;
  return 1;
}

export function generateDashboardAggregates(pipelineResult: PipelineResult): AggregatedDashboardData {
  const { cleanedData, columnTypes } = pipelineResult;
  if (cleanedData.length === 0) {
    return { kpis: [], charts: [], dataQualityBadge: 0, lowDataQuality: true, aiInsightContext: {} };
  }

  const dt = aq.from(cleanedData);
  const numRows = dt.numRows();
  
  // 1. Data Quality Badge (usable rows / total rows)
  // Let's count rows that have no nulls in the identified columns
  let cleanRows = 0;
  for (let i = 0; i < numRows; i++) {
    const row = cleanedData[i];
    let isClean = true;
    for (const key in row) {
      if (row[key] == null) {
        isClean = false;
        break;
      }
    }
    if (isClean) cleanRows++;
  }
  const dataQualityBadge = Math.round((cleanRows / numRows) * 100);
  const lowDataQuality = dataQualityBadge < 20;

  // 2. Identify Measures and Dimensions (Exclude ambiguous and identifiers completely)
  const measures = Object.keys(columnTypes).filter(c => {
    const lower = c.toLowerCase();
    const isId = lower === 'id' || lower.endsWith('_id') || lower === 'identifier';
    return columnTypes[c] === 'numeric' && !isId;
  });
  // Dimensions can be categorical or derived date columns
  const dimensions = Object.keys(cleanedData[0]).filter(c => {
    const baseCol = c.replace(/_(Year|Month|Quarter)$/, '');
    return (columnTypes[c] === 'categorical') || (columnTypes[baseCol] === 'date' && c.includes('_'));
  });

  // If low data quality or zero measures, short-circuit or limit output
  const kpiCount = lowDataQuality ? 1 : 3;
  const chartCount = lowDataQuality ? 1 : 3;

  // 3. Select Top KPIs (Mix of Numeric Totals and Categorical Top-Values)
  const kpis: KPI[] = [];
  
  // A. Numeric Total KPI (Take the highest priority measure)
  const sortedMeasures = [...measures].sort((a, b) => getBusinessWeight(b) - getBusinessWeight(a));
  if (sortedMeasures.length > 0 && kpiCount >= 1) {
    const primaryMeasure = sortedMeasures[0];
    const rollup = dt.rollup({ total: aq.op.sum(primaryMeasure) }).objects()[0] as any;
    
    let format: 'currency' | 'number' | 'percent' | 'text' = 'number';
    const measureLower = primaryMeasure.toLowerCase();
    if (measureLower.includes('revenue') || measureLower.includes('sales') || measureLower.includes('amount') || measureLower.includes('spend') || measureLower.includes('cost') || measureLower.includes('price') || measureLower.includes('expense') || measureLower.includes('budget')) {
      format = 'currency';
    } else if (measureLower.includes('rate') || measureLower.includes('margin') || measureLower.includes('percent')) {
      format = 'percent';
    }

    kpis.push({
      title: `Total ${primaryMeasure}`,
      value: rollup.total || 0,
      format,
      type: 'total',
      badgePercentage: 100 // Unfiltered global total is 100% of itself
    });
  }

  // B. Categorical Top-Value KPIs (Take the highest priority categorical dimensions)
  const catDimensions = dimensions.filter(d => columnTypes[d.replace(/_(Year|Month|Quarter)$/, '')] === 'categorical');
  const sortedCatDims = [...catDimensions].sort((a, b) => getBusinessWeight(b) - getBusinessWeight(a));
  
  for (let i = 0; i < Math.min(kpiCount - kpis.length, sortedCatDims.length); i++) {
    if (kpis.length >= kpiCount) break;
    
    const dim = sortedCatDims[i];
    const validRows = dt.filter(aq.escape((d: any) => d[dim] != null));
    const grouped = validRows.groupby(dim).rollup({ count: aq.op.count() }).orderby(aq.desc('count')).objects();
    
    if (grouped.length > 0) {
      const topRow: any = grouped[0];
      const topValue = topRow[dim];
      const count = topRow.count;
      // Calculate what % of valid rows this top value accounts for
      const numValid = validRows.numRows();
      const badgePercentage = numValid > 0 ? Math.round((count / numValid) * 100) : 0;
      
      kpis.push({
        title: `Top ${dim.replace(/_/g, ' ')}`,
        value: topValue || 'Unknown',
        format: 'text',
        type: 'top-value',
        badgePercentage
      });
    }
  }

  // 4. Rank Dimension x Measure pairs for Charts
  const chartCandidates: { dim: string, measure: string, score: number, data: any[] }[] = [];

  for (const dim of dimensions) {
    // Check cardinality (distinct values) to prevent charting 1000s of bars
    const distinctCount = dt.rollup({ dist: aq.op.distinct(dim) }).objects()[0] as any;
    if (distinctCount.dist > 20 || distinctCount.dist < 2) continue; // Too many or too few for a good chart

    for (const measure of measures) {
      // Group by dim, sum the measure
      const grouped = dt.groupby(dim).rollup({ total: aq.op.sum(measure) }).orderby(aq.desc('total'));
      const groupData = grouped.objects();
      
      // Calculate variance / spread score
      // A simple score: Business Weight * (Max / Min if Min > 0)
      const maxVal = (groupData[0] as any)?.total || 0;
      const minVal = (groupData[groupData.length - 1] as any)?.total || 0;
      const varianceScore = minVal > 0 ? (maxVal / minVal) : (maxVal > 0 ? 10 : 0);
      
      const totalScore = getBusinessWeight(dim) * getBusinessWeight(measure) * varianceScore;

      chartCandidates.push({
        dim,
        measure,
        score: totalScore,
        data: groupData
      });
    }
  }

  // Sort candidates by score
  chartCandidates.sort((a, b) => b.score - a.score);

  // Take top unique dimensions if possible to add variety
  const selectedCharts: ChartConfig[] = [];
  const usedDims = new Set<string>();
  
  for (const candidate of chartCandidates) {
    if (selectedCharts.length >= Math.min(chartCount, chartCandidates.length)) break;
    if (!usedDims.has(candidate.dim)) {
      usedDims.add(candidate.dim);
      
      // Explicit Chart Type Selection based on Dimension Type
      let type: 'bar' | 'line' | 'pie' = 'bar';
      const baseCol = candidate.dim.replace(/_(Year|Month|Quarter)$/, '');
      const isDateDim = columnTypes[baseCol] === 'date';
      
      if (isDateDim) {
        // Date dimensions -> line chart
        type = 'line';
      } else {
        // Categorical -> always bar chart (removed pie rule)
        type = 'bar';
      }

      selectedCharts.push({
        id: `chart_${selectedCharts.length + 1}`,
        title: `${candidate.measure} by ${candidate.dim.replace('_', ' ')}`,
        type,
        dataKey: 'total',
        categoryKey: candidate.dim,
        data: candidate.data
      });
    }
  }

  // 5. Construct the AI Context Payload (highly compressed)
  const aiInsightContext = {
    topKPIs: kpis,
    topBreakdowns: selectedCharts.map(c => ({
      title: c.title,
      topValues: c.data.slice(0, 3) // Give AI just the top 3 segments to prevent token bloat
    }))
  };

  return {
    kpis,
    charts: selectedCharts,
    dataQualityBadge,
    lowDataQuality,
    aiInsightContext
  };
}
