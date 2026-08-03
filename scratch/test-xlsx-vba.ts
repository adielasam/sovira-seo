import * as XLSX from 'xlsx';

// create a dummy workbook with macros? Hard to do on the fly.
// I will just check if TypeScript allows workbook.vbaraw
const wb = XLSX.utils.book_new();
console.log('vbaraw exists?', 'vbaraw' in wb);
