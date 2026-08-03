import { processDataPipeline } from '../lib/dataPipeline';
import { generateDashboardAggregates } from '../lib/dashboardAggregator';

console.log("================= CLEAN SAMPLE =================");

const cleanData = [
  { ID: "1", Revenue: "1500", Cost: "500", Date: "2024-01-15", Region: "North" },
  { ID: "2", Revenue: "2000", Cost: "800", Date: "2024-02-20", Region: "South" },
  { ID: "3", Revenue: "1800", Cost: "600", Date: "2024-03-10", Region: "East" },
  { ID: "4", Revenue: "2500", Cost: "1000", Date: "2024-04-05", Region: "West" },
  { ID: "5", Revenue: "1600", Cost: "550", Date: "2024-05-12", Region: "North" }
];

const cleanResult = processDataPipeline(cleanData);
const cleanAgg = generateDashboardAggregates(cleanResult);

console.log("Data Quality Badge:", cleanAgg.dataQualityBadge + "%");
console.log("Low Data Quality Flag:", cleanAgg.lowDataQuality);
console.log("\nKPIs (" + cleanAgg.kpis.length + "):");
console.log(JSON.stringify(cleanAgg.kpis, null, 2));
console.log("\nCharts (" + cleanAgg.charts.length + "):");
console.log(JSON.stringify(cleanAgg.charts.map(c => ({ id: c.id, title: c.title, type: c.type })), null, 2));


console.log("\n\n================= MESSY SAMPLE =================");

const messyData = [
  { ID: "1", Sales: null, Region: null },
  { ID: "2", Sales: "2000", Region: "South" },
  { ID: "3", Sales: null, Region: null },
  { ID: "4", Sales: "bad-number", Region: "North" },
  { ID: "5", Sales: null, Region: null }
];

const messyResult = processDataPipeline(messyData);
const messyAgg = generateDashboardAggregates(messyResult);

console.log("Data Quality Badge:", messyAgg.dataQualityBadge + "%");
console.log("Low Data Quality Flag:", messyAgg.lowDataQuality);
console.log("\nKPIs (" + messyAgg.kpis.length + "):");
console.log(JSON.stringify(messyAgg.kpis, null, 2));
console.log("\nCharts (" + messyAgg.charts.length + "):");
console.log(JSON.stringify(messyAgg.charts.map(c => ({ id: c.id, title: c.title, type: c.type })), null, 2));
