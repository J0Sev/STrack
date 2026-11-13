import { test } from "node:test";
import assert from "node:assert/strict";
import { unionMs, stableSessionId, groupRecords, summarizeGroup, selectSource, buildSessions } from "../src/services/sessionBuilder.js";

const rec = (stage, start, end, source = "Watch") => ({
  source,
  stage,
  start: new Date(start),
  end: new Date(end),
});

const NIGHT_1 = [
  rec("inBed", "2026-10-03T23:00:00Z", "2026-10-04T07:00:00Z"),
  rec("core", "2026-10-03T23:10:00Z", "2026-10-04T01:10:00Z"), // 2h
  rec("deep", "2026-10-04T01:10:00Z", "2026-10-04T02:10:00Z"), // 1h
  rec("awake", "2026-10-04T02:10:00Z", "2026-10-04T02:20:00Z"), // 10m
  rec("rem", "2026-10-04T02:20:00Z", "2026-10-04T04:20:00Z"), // 2h
];

const NIGHT_2 = [
  rec("core", "2026-10-04T23:30:00Z", "2026-10-05T05:30:00Z"), // 6h
];

test("unionMs counts overlapping intervals once", () => {
  const ms = unionMs([
    { start: 0, end: 100 },
    { start: 50, end: 150 },
    { start: 300, end: 400 },
  ]);
  assert.equal(ms, 250);
  assert.equal(unionMs([]), 0);
});

test("stableSessionId is deterministic, UUID-shaped, and varies with the start time", () => {
  const a = stableSessionId("2026-10-03T23:00:00.000Z");
  assert.equal(a, stableSessionId("2026-10-03T23:00:00.000Z"));
  assert.notEqual(a, stableSessionId("2026-10-04T23:00:00.000Z"));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("groupRecords splits on gaps longer than two hours", () => {
  const groups = groupRecords([...NIGHT_2, ...NIGHT_1]); // deliberately out of order
  assert.equal(groups.length, 2);
  assert.equal(groups[0].length, 5);
  assert.equal(groups[1].length, 1);
});

test("groupRecords keeps overlapping inBed records in the same night", () => {
  // The inBed record ends at 07:00; a later awake record at 06:55 must not start a new night.
  const groups = groupRecords([...NIGHT_1, rec("awake", "2026-10-04T06:55:00Z", "2026-10-04T07:00:00Z")]);
  assert.equal(groups.length, 1);
});

test("summarizeGroup computes durations in seconds without double counting inBed", () => {
  const session = summarizeGroup(NIGHT_1);
  assert.equal(session.totalDuration, 5 * 3600);
  assert.equal(session.coreDuration, 2 * 3600);
  assert.equal(session.deepDuration, 3600);
  assert.equal(session.remDuration, 2 * 3600);
  assert.equal(session.awakeDuration, 600);
  assert.equal(session.timeInBed, 8 * 3600);
  assert.equal(session.startDate, "2026-10-03T23:00:00.000Z");
  assert.equal(session.endDate, "2026-10-04T07:00:00.000Z");
});

test("summarizeGroup returns null stage fields when a stage is missing", () => {
  const session = summarizeGroup(NIGHT_2);
  assert.equal(session.deepDuration, null);
  assert.equal(session.remDuration, null);
  assert.equal(session.awakeDuration, null);
});

test("summarizeGroup skips groups with no asleep time", () => {
  assert.equal(summarizeGroup([rec("inBed", "2026-10-03T23:00:00Z", "2026-10-04T07:00:00Z")]), null);
});

test("buildSessions returns one session per night, oldest first, with stable ids", () => {
  const sessions = buildSessions([...NIGHT_2, ...NIGHT_1]);
  assert.equal(sessions.length, 2);
  assert.ok(sessions[0].startDate < sessions[1].startDate);

  const again = buildSessions([...NIGHT_1, ...NIGHT_2]);
  assert.deepEqual(again.map((s) => s.id), sessions.map((s) => s.id));
});

//Source selection

const PHONE = "Joseph's iPhone";
const WATCH = "Joseph's Apple Watch";

test("selectSource leaves a single-source night untouched", () => {
  assert.equal(selectSource(NIGHT_1).length, NIGHT_1.length);
});

test("selectSource prefers the Watch over the iPhone", () => {
  const group = [
    rec("asleep", "2026-10-03T23:00:00Z", "2026-10-04T08:00:00Z", PHONE), // 9h, longer but less precise
    rec("core", "2026-10-03T23:10:00Z", "2026-10-04T05:10:00Z", WATCH), // 6h
  ];
  const kept = selectSource(group);
  assert.deepEqual([...new Set(kept.map((r) => r.source))], [WATCH]);
});

test("selectSource falls back to the iPhone when the Watch has no asleep data that night", () => {
  const group = [
    rec("asleep", "2026-10-03T23:00:00Z", "2026-10-04T06:00:00Z", PHONE),
    rec("awake", "2026-10-04T03:00:00Z", "2026-10-04T03:05:00Z", WATCH),
  ];
  const kept = selectSource(group);
  assert.deepEqual([...new Set(kept.map((r) => r.source))], [PHONE]);
});

test("selectSource picks the source with the most asleep time when none match the pattern", () => {
  const group = [
    rec("asleep", "2026-10-03T23:00:00Z", "2026-10-04T03:00:00Z", "Sleep App A"), // 4h
    rec("asleep", "2026-10-03T23:00:00Z", "2026-10-04T06:00:00Z", "Sleep App B"), // 7h
  ];
  const kept = selectSource(group);
  assert.deepEqual([...new Set(kept.map((r) => r.source))], ["Sleep App B"]);
});

test("buildSessions counts a night once when two devices recorded it", () => {
  const sessions = buildSessions([
    ...NIGHT_1.map((r) => ({ ...r, source: WATCH })),
    rec("asleep", "2026-10-03T23:00:00Z", "2026-10-04T07:00:00Z", PHONE),
  ]);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].totalDuration, 5 * 3600);
});
