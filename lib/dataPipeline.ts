import * as aq from 'arquero';

export type ColumnType = 'numeric' | 'date' | 'categorical' | 'ambiguous';

export interface MissingValueReport {
  missingCount: number;
  missingPercentage: number;
}

export interface PipelineResult {
  cleanedData: any[]; // The final array of cleaned objects
  columnTypes: Record<string, ColumnType>;
  missingValueReport: Record<string, MissingValueReport>;
}

/**
 * Safely parse a numeric value, removing common currency/percentage symbols
 */
function parseNumeric(val: any): number | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;
  
  const cleaned = String(val).replace(/[\$,%]/g, '').trim();
  if (cleaned === '') return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Safely parse a date
 */
function parseDate(val: any): Date | null {
  if (val == null || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  
  // Skip pure numbers to avoid misclassifying things like '2022' or '100' as a date.
  // We want dates like '2022-01-01' or 'Jan 1, 2022'
  if (!isNaN(Number(val))) return null;

  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function cleanString(val: any): string | null {
  if (val == null || String(val).trim() === '') return null;
  return String(val).trim();
}

/**
 * Phase 1 Pipeline: Analyzes, cleans, and derives data using Arquero
 */
export function processDataPipeline(rawData: any[]): PipelineResult {
  if (!rawData || rawData.length === 0) {
    return { cleanedData: [], columnTypes: {}, missingValueReport: {} };
  }

  const columns = Object.keys(rawData[0] || {});
  const totalRows = rawData.length;
  const sampleLimit = Math.min(totalRows, 2000);
  
  const columnTypes: Record<string, ColumnType> = {};
  const missingValueReport: Record<string, MissingValueReport> = {};

  // 1. Column Type Detection & Missing Value Report
  for (const col of columns) {
    let numericCount = 0;
    let dateCount = 0;
    let missingCount = 0;
    let validCount = 0;

    // Full scan for missing values
    for (const row of rawData) {
      if (row[col] == null || String(row[col]).trim() === '') {
        missingCount++;
      }
    }

    missingValueReport[col] = {
      missingCount,
      missingPercentage: parseFloat(((missingCount / totalRows) * 100).toFixed(2))
    };

    // Sample scan for type detection
    for (let i = 0; i < sampleLimit; i++) {
      const val = rawData[i][col];
      if (val == null || String(val).trim() === '') {
        continue;
      }
      validCount++;

      if (parseNumeric(val) !== null) {
        numericCount++;
      } else if (parseDate(val) !== null) {
        dateCount++;
      }
    }

    if (validCount === 0) {
      columnTypes[col] = 'categorical';
      continue;
    }

    const numericRatio = numericCount / validCount;
    const dateRatio = dateCount / validCount;

    if (numericRatio >= 0.9) {
      columnTypes[col] = 'numeric';
    } else if (dateRatio >= 0.9) {
      columnTypes[col] = 'date';
    } else if (numericRatio > 0.3 || dateRatio > 0.3) {
      // If it's a significant mix, flag as ambiguous (e.g. 70% numeric, 30% text)
      columnTypes[col] = 'ambiguous';
    } else {
      columnTypes[col] = 'categorical';
    }
  }

  // 2. Data Cleaning mapping
  const cleanedArray = rawData.map(row => {
    const newRow: any = {};
    for (const col of columns) {
      const val = row[col];
      const type = columnTypes[col];
      const cleaned = cleanString(val);

      if (cleaned === null) {
        newRow[col] = null;
        continue;
      }

      if (type === 'numeric') {
        newRow[col] = parseNumeric(val);
      } else if (type === 'date') {
        newRow[col] = parseDate(val);
      } else if (type === 'categorical') {
        // Standardize categorical casing to uppercase for grouping consistency
        newRow[col] = cleaned.toUpperCase();
      } else {
        // Ambiguous - leave as raw string, but trimmed
        newRow[col] = cleaned;
      }
    }
    return newRow;
  });

  // 3. Arquero DataFrame Operations (Derived Columns)
  let dt = aq.from(cleanedArray);
  const dateCols = columns.filter(c => columnTypes[c] === 'date');
  
  if (dateCols.length > 0) {
    const deriveExprs: Record<string, any> = {};
    for (const dCol of dateCols) {
      // Derive Year, Month, Quarter using aq.escape
      deriveExprs[`${dCol}_Year`] = aq.escape((d: any) => {
        const dateObj = d[dCol];
        return dateObj ? dateObj.getFullYear() : null;
      });
      deriveExprs[`${dCol}_Month`] = aq.escape((d: any) => {
        const dateObj = d[dCol];
        return dateObj ? dateObj.getMonth() + 1 : null;
      });
      deriveExprs[`${dCol}_Quarter`] = aq.escape((d: any) => {
        const dateObj = d[dCol];
        return dateObj ? Math.floor(dateObj.getMonth() / 3) + 1 : null;
      });
    }
    dt = dt.derive(deriveExprs);
  }

  return {
    cleanedData: dt.objects(),
    columnTypes,
    missingValueReport
  };
}
