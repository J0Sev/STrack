import fs from "node:fs";
import { parseSleepRecords } from "../src/services/healthExport.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/inspect-export.js <path-to-export.xml>");
  process.exit(1);
}

const records = await parseSleepRecords(fs.createReadStream(file));
const count = (key) =>
  records.reduce((acc, r) => ({ ...acc, [r[key]]: (acc[key = r[key]] ?? 0) + 1 }), {});

console.log("Sleep records:", records.length);
if (records.length > 0) {
  const starts = records.map((r) => r.start.getTime());
  console.log("First:", new Date(Math.min(...starts)).toISOString());
  console.log("Last: ", new Date(Math.max(...starts)).toISOString());
}
const tally = (key) => {
  const out = {};
  for (const r of records) out[r[key]] = (out[r[key]] ?? 0) + 1;
  return out;
};
console.log("By stage:", tally("stage"));
console.log("By source:", tally("source"));