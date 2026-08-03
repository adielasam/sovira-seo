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
  type: 'bar' | 'line' | 'pie' | 'radar';
  dataKey: string;
  categoryKey: string;
  orientation?: 'horizontal' | 'vertical'; // for bar charts
  data: any[];
}

export interface AggregatedDashboardData {
  title: string;
  kpis: KPI[];
  charts: ChartConfig[];
  availableYears: number[];
  availableMonths: number[];
  dataQualityBadge: number; // 0 to 100
  lowDataQuality: boolean; // True if data quality < 20%
  aiInsightContext: any; // The payload to send to AI
}

// Helper to check if a column name matches common business terms
function getBusinessWeight(colName: string): number {
  const lower = colName.toLowerCase();
  const highPriority = ['revenue', 'sales', 'amount', 'profit', 'cost', 'spend', 'budget', 'price', 'expense'];
  const medPriority = ['region', 'category', 'department', 'status', 'month', 'year', 'date', 'customer', 'country', 'device', 'source', 'traffic', 'quality', 'satisfaction'];
  
  if (highPriority.some(term => lower.includes(term))) return 3;
  if (medPriority.some(term => lower.includes(term))) return 1.5;
  return 1;
}

export function generateDashboardAggregates(
  pipelineResult: PipelineResult,
  selectedYears?: Set<number | string>,
  selectedMonths?: Set<number | string>
): AggregatedDashboardData {
  const { cleanedData, columnTypes } = pipelineResult;
  if (cleanedData.length === 0) {
    return { title: 'Analytics Dashboard', kpis: [], charts: [], availableYears: [], availableMonths: [], dataQualityBadge: 0, lowDataQuality: true, aiInsightContext: {} };
  }

  let dt = aq.from(cleanedData);
  const totalNumRows = dt.numRows();
  
  const availableYears = new Set<number>();
  const availableMonths = new Set<number>();
  
  const dateColumns = Object.keys(columnTypes).filter(c => columnTypes[c] === 'date');
  
  if (dateColumns.length > 0) {
    const primaryDateCol = dateColumns[0];
    const hasYearCol = Object.keys(columnTypes).some(c => c.toLowerCase() === 'year');
    const hasMonthCol = Object.keys(columnTypes).some(c => c.toLowerCase() === 'month');
    
    for (let i = 0; i < totalNumRows; i++) {
      const row = cleanedData[i];
      let rowYear: number | null = null;
      let rowMonth: number | null = null;
      
      if (hasYearCol) {
        const yCol = Object.keys(row).find(c => c.toLowerCase() === 'year');
        if (yCol && row[yCol]) rowYear = Number(row[yCol]);
      } else {
        const d = row[primaryDateCol];
        if (d instanceof Date) rowYear = d.getFullYear();
      }
      
      if (hasMonthCol) {
         const mCol = Object.keys(row).find(c => c.toLowerCase() === 'month');
         if (mCol && row[mCol]) rowMonth = Number(row[mCol]);
      } else {
         const d = row[primaryDateCol];
         if (d instanceof Date) rowMonth = d.getMonth() + 1;
      }
      
      if (rowYear) availableYears.add(rowYear);
      if (rowMonth) availableMonths.add(rowMonth);
    }
    
    if ((selectedYears && selectedYears.size > 0) || (selectedMonths && selectedMonths.size > 0)) {
      dt = dt.filter(aq.escape((d: any) => {
        let matchesYear = true;
        let matchesMonth = true;
        
        let rowYear: number | null = null;
        let rowMonth: number | null = null;
        
        const yCol = Object.keys(d).find(c => c.toLowerCase() === 'year');
        if (yCol && d[yCol]) rowYear = Number(d[yCol]);
        else if (d[primaryDateCol] instanceof Date) rowYear = d[primaryDateCol].getFullYear();
        
        const mCol = Object.keys(d).find(c => c.toLowerCase() === 'month');
        if (mCol && d[mCol]) rowMonth = Number(d[mCol]);
        else if (d[primaryDateCol] instanceof Date) rowMonth = d[primaryDateCol].getMonth() + 1;
        
        if (selectedYears && selectedYears.size > 0 && rowYear !== null) {
          matchesYear = selectedYears.has(rowYear) || selectedYears.has(rowYear.toString());
        }
        if (selectedMonths && selectedMonths.size > 0 && rowMonth !== null) {
           matchesMonth = selectedMonths.has(rowMonth) || selectedMonths.has(rowMonth.toString());
        }
        
        return matchesYear && matchesMonth;
      }));
    }
  }

  const numRows = dt.numRows();
  if (numRows === 0) {
    return { 
       title: 'Analytics Dashboard',
       kpis: [], charts: [], 
       availableYears: Array.from(availableYears).sort(), 
       availableMonths: Array.from(availableMonths).sort(), 
       dataQualityBadge: 0, lowDataQuality: true, aiInsightContext: {} 
    };
  }

  let cleanRows = 0;
  const objects = dt.objects();
  for (let i = 0; i < numRows; i++) {
    const row = objects[i] as any;
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

  const measures = Object.keys(columnTypes).filter(c => {
    const lower = c.toLowerCase();
    const isId = lower === 'id' || lower.endsWith('_id') || lower === 'identifier';
    return columnTypes[c] === 'numeric' && !isId;
  });
  const dimensions = Object.keys(columnTypes).filter(c => {
    const baseCol = c.replace(/_(Year|Month|Quarter)$/, '');
    return (columnTypes[c] === 'categorical') || (columnTypes[baseCol] === 'date' && c.includes('_'));
  });

  const kpiCount = lowDataQuality ? 1 : 5;
  const chartCount = lowDataQuality ? 1 : 5;

  const kpis: KPI[] = [];
  const sortedMeasures = [...measures].sort((a, b) => getBusinessWeight(b) - getBusinessWeight(a));
  
  for (let i = 0; i < Math.min(3, sortedMeasures.length); i++) {
    if (kpis.length >= kpiCount) break;
    const measure = sortedMeasures[i];
    const rollup = dt.rollup({ total: aq.op.sum(measure) }).objects()[0] as any;
    
    let format: 'currency' | 'number' | 'percent' | 'text' = 'number';
    const measureLower = measure.toLowerCase();
    if (measureLower.includes('revenue') || measureLower.includes('sales') || measureLower.includes('amount') || measureLower.includes('spend') || measureLower.includes('cost') || measureLower.includes('price') || measureLower.includes('expense') || measureLower.includes('budget')) {
      format = 'currency';
    } else if (measureLower.includes('rate') || measureLower.includes('margin') || measureLower.includes('percent')) {
      format = 'percent';
    }

    kpis.push({
      title: `Total ${measure.replace(/_/g, ' ')}`,
      value: rollup.total || 0,
      format,
      type: 'total',
      badgePercentage: 100
    });
  }

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

  const chartCandidates: { dim: string, measure: string, score: number, data: any[], distinctCount: number }[] = [];

  for (const dim of dimensions) {
    const distinctCountObj = dt.rollup({ dist: aq.op.distinct(dim) }).objects()[0] as any;
    const distinctCount = distinctCountObj.dist;
    if (distinctCount > 50 || distinctCount < 2) continue;

    for (const measure of measures) {
      const grouped = dt.groupby(dim).rollup({ total: aq.op.sum(measure) }).orderby(aq.desc('total'));
      const groupData = grouped.objects();
      
      const maxVal = (groupData[0] as any)?.total || 0;
      const minVal = (groupData[groupData.length - 1] as any)?.total || 0;
      const varianceScore = minVal > 0 ? (maxVal / minVal) : (maxVal > 0 ? 10 : 0);
      const totalScore = getBusinessWeight(dim) * getBusinessWeight(measure) * varianceScore;

      chartCandidates.push({ dim, measure, score: totalScore, data: groupData, distinctCount });
    }
  }

  chartCandidates.sort((a, b) => b.score - a.score);

  const selectedCharts: ChartConfig[] = [];
  const usedDims = new Set<string>();
  
  let hasLine = false;
  let hasPie = false;
  let hasHorizontalBar = false;
  let hasRadar = false;

  for (const candidate of chartCandidates) {
    if (selectedCharts.length >= Math.min(chartCount, chartCandidates.length)) break;
    if (!usedDims.has(candidate.dim)) {
      usedDims.add(candidate.dim);
      
      let type: 'bar' | 'line' | 'pie' | 'radar' = 'bar';
      let orientation: 'vertical' | 'horizontal' = 'vertical';
      
      const baseCol = candidate.dim.replace(/_(Year|Month|Quarter)$/, '');
      const isDateDim = columnTypes[baseCol] === 'date';
      
      if (isDateDim) {
        type = 'line';
        hasLine = true;
      } else if (!hasRadar && candidate.distinctCount >= 3 && candidate.distinctCount <= 8 && !isDateDim) {
        type = 'radar';
        hasRadar = true;
      } else if (!hasPie && candidate.distinctCount <= 6) {
        type = 'pie';
        hasPie = true;
      } else if (!hasHorizontalBar && candidate.distinctCount > 8 && candidate.distinctCount <= 50) {
        type = 'bar';
        orientation = 'horizontal';
        hasHorizontalBar = true;
      } else {
        type = 'bar';
        orientation = 'vertical';
      }

      selectedCharts.push({
        id: `chart_${selectedCharts.length + 1}`,
        title: `${candidate.measure} by ${candidate.dim.replace('_', ' ')}`,
        type,
        orientation,
        dataKey: 'total',
        categoryKey: candidate.dim,
        data: candidate.data
      });
    }
  }

  // Generate dynamic title
  let dynamicTitle = 'Analytics Dashboard';
  const primaryKpiStr = kpis.length > 0 ? kpis[0].title.replace('Total ', '') : '';
  const yrsArr = Array.from(availableYears).sort((a,b)=>a-b);
  const titleYear = yrsArr.length > 0 ? yrsArr[yrsArr.length - 1] : '';
  
  if (primaryKpiStr && titleYear) {
      dynamicTitle = `${primaryKpiStr} Dashboard ${titleYear}`;
  } else if (primaryKpiStr) {
      dynamicTitle = `${primaryKpiStr} Analytics Dashboard`;
  }

  const aiInsightContext = {
    topKPIs: kpis,
    topBreakdowns: selectedCharts.map(c => ({
      title: c.title,
      topValues: c.data.slice(0, 3) 
    }))
  };

  return {
    title: dynamicTitle,
    kpis,
    charts: selectedCharts,
    availableYears: Array.from(availableYears).sort(),
    availableMonths: Array.from(availableMonths).sort(),
    dataQualityBadge,
    lowDataQuality,
    aiInsightContext
  };
}
