import { createHash } from "node:crypto";

const GAP_MS = 2 * 60 * 60 * 1000; // records further apart than this start a new night
const ASLEEP_STAGES = ["core", "deep", "rem", "asleep"];

const toInterval = (r) => ({ start: r.start.getTime(), end: r.end.getTime() });
const toSeconds = (ms) => Math.round(ms / 1000);

export function unionMs(intervals) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = null;
  let curEnd = null;

  for (const { start, end } of sorted) {
    if (curEnd === null || start > curEnd) {
      if (curEnd !== null) total += curEnd - curStart;
      curStart = start;
      curEnd = end;
    } else if (end > curEnd) {
      curEnd = end;
    }
  }
  if (curEnd !== null) total += curEnd - curStart;
  return total;
}

export function stableSessionId(startIso) {
  const bytes = Buffer.from(createHash("sha1").update(`strack-sleep:${startIso}`).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = bytes.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function groupRecords(records, gapMs = GAP_MS) {
  const sorted = [...records].sort((a, b) => a.start - b.start);
  const groups = [];
  let current = [];
  let maxEnd = -Infinity;

  for (const record of sorted) {
    if (current.length > 0 && record.start.getTime() - maxEnd > gapMs) {
      groups.push(current);
      current = [];
      maxEnd = -Infinity;
    }
    current.push(record);
    maxEnd = Math.max(maxEnd, record.end.getTime());
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function stageSeconds(group, stage) {
  const ms = unionMs(group.filter((r) => r.stage === stage).map(toInterval));
  return ms > 0 ? toSeconds(ms) : null;
}

export function summarizeGroup(group) {
  const asleepMs = unionMs(group.filter((r) => ASLEEP_STAGES.includes(r.stage)).map(toInterval));
  if (asleepMs === 0) return null;

  const start = new Date(Math.min(...group.map((r) => r.start.getTime())));
  const end = new Date(Math.max(...group.map((r) => r.end.getTime())));
  const startDate = start.toISOString();

  return {
    id: stableSessionId(startDate),
    startDate,
    endDate: end.toISOString(),
    totalDuration: toSeconds(asleepMs),
    // Everything between first and last record counted once; avoids double-counting overlapping inBed samples.
    timeInBed: toSeconds(unionMs(group.map(toInterval))),
    coreDuration: stageSeconds(group, "core"),
    deepDuration: stageSeconds(group, "deep"),
    remDuration: stageSeconds(group, "rem"),
    awakeDuration: stageSeconds(group, "awake"),
  };
}

function asleepMsForSource(group, source) {
  return unionMs(
    group.filter((r) => r.source === source && ASLEEP_STAGES.includes(r.stage)).map(toInterval)
  );
}

/**
 * When the iPhone and the Apple Watch both wrote sleep for the same night, keep one
 * source so the night isn't counted twice. Only sources with asleep data compete:
 * a source matching `preferPattern` (the Watch, by default) wins; if none match,
 * the source with the most asleep time wins. A night with a single source is untouched.
 */
export function selectSource(group, preferPattern = /watch/i) {
  const sources = [...new Set(group.map((r) => r.source))];
  if (sources.length <= 1) return group;

  const candidates = sources.filter((s) => asleepMsForSource(group, s) > 0);
  if (candidates.length === 0) return group;

  const preferred = candidates.filter((s) => preferPattern.test(s));
  let keep;
  if (preferred.length > 0) {
    keep = new Set(preferred);
  } else {
    const best = candidates.reduce((a, b) => (asleepMsForSource(group, b) > asleepMsForSource(group, a) ? b : a));
    keep = new Set([best]);
  }
  return group.filter((r) => keep.has(r.source));
}

export function buildSessions(records, { gapMs = GAP_MS, preferPattern } = {}) {
  return groupRecords(records, gapMs)
    .map((group) => summarizeGroup(selectSource(group, preferPattern)))
    .filter(Boolean);
}
