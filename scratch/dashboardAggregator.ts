import * as aq from 'arquero';
import { PipelineResult, ColumnType } from './dataPipeline';

export interface KPI {
  title: string;
  value: number | string;
  format: 'currency' | 'number' | 'percent' | 'text';
  type: 'total' | 'top-value';
  subtitle: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'donut' | 'combo' | 'heatmap';
  dataKey: string;
  categoryKey: string;
  dataKey2?: string;
  orientation?: 'horizontal' | 'vertical';
  data: any[];
}

export interface AggregatedDashboardData {
  title: string;
  kpis: KPI[];
  charts: ChartConfig[];
  availableYears: number[];
  availableMonths: number[];
  dataQualityBadge: number;
  lowDataQuality: boolean;
  aiInsightContext: any;
}

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
  let primaryDateCol = dateColumns.length > 0 ? dateColumns[0] : null;
  
  if (primaryDateCol) {
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
        else if (primaryDateCol && d[primaryDateCol] instanceof Date) rowYear = d[primaryDateCol].getFullYear();
        
        const mCol = Object.keys(d).find(c => c.toLowerCase() === 'month');
        if (mCol && d[mCol]) rowMonth = Number(d[mCol]);
        else if (primaryDateCol && d[primaryDateCol] instanceof Date) rowMonth = d[primaryDateCol].getMonth() + 1;
        
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
    return { title: 'Analytics Dashboard', kpis: [], charts: [], availableYears: [], availableMonths: [], dataQualityBadge: 0, lowDataQuality: true, aiInsightContext: {} };
  }

  const measures = Object.keys(columnTypes).filter(c => {
    const lower = c.toLowerCase();
    const isId = lower === 'id' || lower.endsWith('_id') || lower === 'identifier';
    return columnTypes[c] === 'numeric' && !isId;
  });
  const dimensions = Object.keys(columnTypes).filter(c => {
    const baseCol = c.replace(/_(Year|Month|Quarter)$/, '');
    return (columnTypes[c] === 'categorical') || (columnTypes[baseCol] === 'date' && c.includes('_'));
  });

  const kpis: KPI[] = [];
  const sortedMeasures = [...measures].sort((a, b) => getBusinessWeight(b) - getBusinessWeight(a));
  
  // Oreate UI uses exactly 4 minimal KPIs
  for (let i = 0; i < Math.min(2, sortedMeasures.length); i++) {
    const measure = sortedMeasures[i];
    const rollup = dt.rollup({ total: aq.op.sum(measure) }).objects()[0] as any;
    
    let format: 'currency' | 'number' | 'percent' | 'text' = 'number';
    const measureLower = measure.toLowerCase();
    if (measureLower.includes('revenue') || measureLower.includes('sales') || measureLower.includes('amount') || measureLower.includes('spend') || measureLower.includes('cost') || measureLower.includes('price')) {
      format = 'currency';
    } else if (measureLower.includes('rate') || measureLower.includes('margin') || measureLower.includes('percent')) {
      format = 'percent';
    }

    kpis.push({
      title: `TOTAL ${measure.replace(/_/g, ' ').toUpperCase()}`,
      value: rollup.total || 0,
      format,
      type: 'total',
      subtitle: `Across all records`
    });
  }

  const catDimensions = dimensions.filter(d => columnTypes[d.replace(/_(Year|Month|Quarter)$/, '')] === 'categorical');
  const sortedCatDims = [...catDimensions].sort((a, b) => getBusinessWeight(b) - getBusinessWeight(a));
  
  for (let i = 0; i < Math.min(4 - kpis.length, sortedCatDims.length); i++) {
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
        title: `TOP ${dim.replace(/_/g, ' ').toUpperCase()}`,
        value: topValue || 'Unknown',
        format: 'text',
        type: 'top-value',
        subtitle: `~${badgePercentage}% of total`
      });
    }
  }

  const selectedCharts: ChartConfig[] = [];
  
  // 1. Combo Chart (Date vs Measure)
  const dateDims = dimensions.filter(d => columnTypes[d.replace(/_(Year|Month|Quarter)$/, '')] === 'date');
  const bestDateDim = dateDims.length > 0 ? dateDims[0] : (catDimensions.length > 0 ? catDimensions[0] : null);
  const bestMeasure = sortedMeasures[0];
  const secondMeasure = sortedMeasures.length > 1 ? sortedMeasures[1] : undefined;

  if (bestDateDim && bestMeasure) {
    const aggOps: any = { total1: aq.op.sum(bestMeasure) };
    if (secondMeasure) aggOps.total2 = aq.op.sum(secondMeasure);
    
    let groupedData = dt.groupby(bestDateDim).rollup(aggOps);
    if (columnTypes[bestDateDim] === 'date') groupedData = groupedData.orderby(bestDateDim);
    else groupedData = groupedData.orderby(aq.desc('total1'));

    selectedCharts.push({
      id: `chart_combo`,
      title: `${bestMeasure} ${secondMeasure ? `& ${secondMeasure}` : 'Trend'} over ${bestDateDim}`,
      type: 'combo',
      dataKey: 'total1',
      categoryKey: bestDateDim,
      dataKey2: secondMeasure ? 'total2' : undefined,
      data: groupedData.objects()
    });
  }

  // 2. Donut (Small Categorical) & 3. Horizontal Bar (Large Categorical)
  let hasDonut = false;
  let hasBar = false;

  for (const dim of sortedCatDims) {
    if (dim === bestDateDim) continue; // Skip if used in combo
    const distinctCountObj = dt.rollup({ dist: aq.op.distinct(dim) }).objects()[0] as any;
    const distinct = distinctCountObj.dist;
    
    if (distinct >= 2 && distinct <= 6 && !hasDonut) {
      const groupedData = dt.groupby(dim).rollup({ total: aq.op.sum(bestMeasure) }).orderby(aq.desc('total')).objects();
      selectedCharts.push({
        id: `chart_donut`,
        title: `${bestMeasure} by ${dim}`,
        type: 'donut',
        dataKey: 'total',
        categoryKey: dim,
        data: groupedData
      });
      hasDonut = true;
    } else if (distinct > 4 && distinct <= 50 && !hasBar) {
      const groupedData = dt.groupby(dim).rollup({ total: aq.op.sum(bestMeasure) }).orderby(aq.desc('total')).objects();
      selectedCharts.push({
        id: `chart_bar`,
        title: `${bestMeasure} by ${dim}`,
        type: 'bar',
        orientation: 'horizontal',
        dataKey: 'total',
        categoryKey: dim,
        data: groupedData
      });
      hasBar = true;
    }
  }

  // 4. Line Chart
  if (dateDims.length > 1 || (dateDims.length > 0 && catDimensions.length > 0)) {
     const nextDateDim = dateDims.length > 1 ? dateDims[1] : dateDims[0];
     const measureToUse = secondMeasure || bestMeasure;
     const groupedData = dt.groupby(nextDateDim).rollup({ total: aq.op.sum(measureToUse) }).orderby(nextDateDim).objects();
     
     selectedCharts.push({
        id: `chart_line`,
        title: `${measureToUse} by ${nextDateDim}`,
        type: 'line',
        dataKey: 'total',
        categoryKey: nextDateDim,
        data: groupedData
     });
  } else if (!hasBar && sortedCatDims.length > 1) {
     // fallback if no line
     const dim = sortedCatDims[1];
     const groupedData = dt.groupby(dim).rollup({ total: aq.op.sum(bestMeasure) }).orderby(aq.desc('total')).objects();
     selectedCharts.push({
        id: `chart_bar2`,
        title: `${bestMeasure} by ${dim}`,
        type: 'bar',
        orientation: 'vertical',
        dataKey: 'total',
        categoryKey: dim,
        data: groupedData
     });
  }

  // 5. Heatmap (Matrix of two categoricals)
  if (sortedCatDims.length >= 2) {
    const dim1 = sortedCatDims[0];
    const dim2 = sortedCatDims[1];
    
    // limit matrix size
    const topD1 = dt.groupby(dim1).rollup({ count: aq.op.count() }).orderby(aq.desc('count')).objects().slice(0, 5).map((d: any) => d[dim1]);
    const topD2 = dt.groupby(dim2).rollup({ count: aq.op.count() }).orderby(aq.desc('count')).objects().slice(0, 5).map((d: any) => d[dim2]);
    
    const filteredDt = dt.filter(aq.escape((d: any) => topD1.includes(d[dim1]) && topD2.includes(d[dim2])));
    const matrixData = filteredDt.groupby(dim1, dim2).rollup({ total: aq.op.sum(bestMeasure) }).objects();
    
    selectedCharts.push({
        id: `chart_heatmap`,
        title: `${dim1} vs ${dim2} Matrix`,
        type: 'heatmap',
        dataKey: 'total',
        categoryKey: dim1,
        dataKey2: dim2,
        data: matrixData
    });
  }

  const aiInsightContext = {
    topKPIs: kpis,
    topBreakdowns: selectedCharts.map(c => ({
      id: c.id,
      title: c.title,
      topValues: c.data.slice(0, 5) 
    }))
  };

  return {
    title: 'Analytics Dashboard',
    kpis,
    charts: selectedCharts,
    availableYears: Array.from(availableYears).sort(),
    availableMonths: Array.from(availableMonths).sort(),
    dataQualityBadge: 100,
    lowDataQuality: false,
    aiInsightContext
  };
}
