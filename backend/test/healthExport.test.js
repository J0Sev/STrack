import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { parseHealthDate, stageFromValue, parseSleepRecords } from "../src/services/healthExport.js";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<HealthData locale="en_US">
 <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="Watch" startDate="2026-10-03 23:00:00 -0400" endDate="2026-10-03 23:00:05 -0400" value="58"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-03 23:12:44 -0400" endDate="2026-10-03 23:41:02 -0400" value="HKCategoryValueSleepAnalysisAsleepCore"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-03 23:41:02 -0400" endDate="2026-10-04 00:20:00 -0400" value="HKCategoryValueSleepAnalysisAsleepDeep"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-04 00:20:00 -0400" endDate="2026-10-04 00:25:00 -0400" value="HKCategoryValueSleepAnalysisAwake"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2026-10-04 00:30:00 -0400" endDate="2026-10-04 00:30:00 -0400" value="HKCategoryValueSleepAnalysisAsleepREM"/>
</HealthData>`;

test("parseHealthDate reads Apple's date format with its offset", () => {
  const d = parseHealthDate("2026-10-03 23:12:44 -0400");
  assert.equal(d.toISOString(), "2026-10-04T03:12:44.000Z");
});

test("parseHealthDate returns null for bad input", () => {
  assert.equal(parseHealthDate("yesterday"), null);
  assert.equal(parseHealthDate(undefined), null);
});

test("stageFromValue maps known values and rejects unknown ones", () => {
  assert.equal(stageFromValue("HKCategoryValueSleepAnalysisAsleepCore"), "core");
  assert.equal(stageFromValue("HKCategoryValueSleepAnalysisInBed"), "inBed");
  assert.equal(stageFromValue("HKCategoryValueSleepAnalysisAsleep"), "asleep");
  assert.equal(stageFromValue("HKCategoryValueSleepAnalysisSomethingNew"), null);
});

test("parseSleepRecords keeps only valid sleep records", async () => {
  const records = await parseSleepRecords(Readable.from([SAMPLE]));
  // The heart-rate record and the zero-length REM record are skipped.
  assert.equal(records.length, 3);
  assert.deepEqual(records.map((r) => r.stage), ["core", "deep", "awake"]);
  assert.equal(records[0].source, "Watch");
  assert.ok(records[0].end > records[0].start);
});