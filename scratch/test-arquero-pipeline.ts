import { processDataPipeline } from '../lib/dataPipeline';

const sampleData = [
  { ID: " 1 ", Revenue: "$1,500.50", Date: "2024-01-15", Region: "north", AmbiguousCol: "100" },
  { ID: "2", Revenue: "2,000", Date: "2024-02-20", Region: "South ", AmbiguousCol: "200" },
  { ID: "3", Revenue: "", Date: "2024-03-10", Region: "EAST", AmbiguousCol: "text-value" }, // Mixed type
  { ID: "4", Revenue: "300%", Date: "invalid-date", Region: "north", AmbiguousCol: "400" },
  { ID: "5", Revenue: null, Date: "2024-05-01", Region: "  ", AmbiguousCol: "500" },
  { ID: "6", Revenue: "50", Date: "2024-06-15", Region: "south", AmbiguousCol: "text-again" }
];

const result = processDataPipeline(sampleData);

console.log("=== COLUMN TYPES ===");
console.log(JSON.stringify(result.columnTypes, null, 2));

console.log("\n=== MISSING VALUE REPORT ===");
console.log(JSON.stringify(result.missingValueReport, null, 2));

console.log("\n=== CLEANED DATA ===");
console.log(JSON.stringify(result.cleanedData, null, 2));
