import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGoal, validateCheckIn, validateSleepSync } from "../src/validate.js";

const validGoal = () => ({
  id: "goal-1",
  targetDurationHours: 8,
  targetBedtime: { hour: 23, minute: 0 },
  targetWakeTime: { hour: 7, minute: 0 },
});

const validCheckIn = () => ({
  id: "ci-1",
  date: "2026-10-04T12:00:00Z",
  caffeineAfter2pm: true,
  screenTimeBeforeBedMinutes: 30,
  alcohol: false,
  exercisedToday: true,
  stressLevel: 3,
  notes: "rough night",
});

const validSession = () => ({
  id: "s-1",
  startDate: "2026-10-03T23:00:00Z",
  endDate: "2026-10-04T07:00:00Z",
  totalDuration: 27000,
  timeInBed: 28800,
  coreDuration: 14000,
  deepDuration: 5000,
  remDuration: 8000,
  awakeDuration: 1800,
});


test("validateGoal accepts a valid goal", () => {
  assert.deepEqual(validateGoal(validGoal()), []);
});

test("validateGoal rejects a missing body", () => {
  assert.ok(validateGoal(undefined).length > 0);
});

test("validateGoal rejects durations outside 4-12 hours", () => {
  for (const hours of [3.5, 12.5, -3, 40]) {
    const errors = validateGoal({ ...validGoal(), targetDurationHours: hours });
    assert.ok(errors.some((e) => e.includes("targetDurationHours")), `expected error for ${hours}`);
  }
});

test("validateGoal accepts the boundary durations", () => {
  assert.deepEqual(validateGoal({ ...validGoal(), targetDurationHours: 4 }), []);
  assert.deepEqual(validateGoal({ ...validGoal(), targetDurationHours: 12 }), []);
});

test("validateGoal rejects a string duration", () => {
  const errors = validateGoal({ ...validGoal(), targetDurationHours: "8" });
  assert.ok(errors.some((e) => e.includes("targetDurationHours")));
});

test("validateGoal rejects out-of-range or missing times", () => {
  assert.ok(validateGoal({ ...validGoal(), targetBedtime: { hour: 24, minute: 0 } }).length > 0);
  assert.ok(validateGoal({ ...validGoal(), targetWakeTime: { hour: 7, minute: 60 } }).length > 0);
  assert.ok(validateGoal({ ...validGoal(), targetBedtime: undefined }).length > 0);
});

test("validateGoal rejects a missing id", () => {
  const { id, ...rest } = validGoal();
  assert.ok(validateGoal(rest).some((e) => e.includes("id")));
});

test("validateCheckIn accepts a valid check-in", () => {
  assert.deepEqual(validateCheckIn(validCheckIn()), []);
});

test("validateCheckIn allows optional fields to be omitted", () => {
  assert.deepEqual(validateCheckIn({ id: "ci-2", date: "2026-10-04T12:00:00Z" }), []);
});

test("validateCheckIn rejects out-of-range stress levels", () => {
  for (const level of [0, 6, 2.5, "high"]) {
    const errors = validateCheckIn({ ...validCheckIn(), stressLevel: level });
    assert.ok(errors.some((e) => e.includes("stressLevel")), `expected error for ${level}`);
  }
});

test("validateCheckIn rejects string booleans", () => {
  const errors = validateCheckIn({ ...validCheckIn(), alcohol: "false" });
  assert.ok(errors.some((e) => e.includes("alcohol")));
});

test("validateCheckIn rejects negative screen time", () => {
  const errors = validateCheckIn({ ...validCheckIn(), screenTimeBeforeBedMinutes: -5 });
  assert.ok(errors.some((e) => e.includes("screenTimeBeforeBedMinutes")));
});

test("validateCheckIn rejects a bad date and overlong notes", () => {
  assert.ok(validateCheckIn({ ...validCheckIn(), date: "yesterday-ish" }).some((e) => e.includes("date")));
  assert.ok(validateCheckIn({ ...validCheckIn(), notes: "x".repeat(1001) }).some((e) => e.includes("notes")));
});


test("validateSleepSync accepts valid sessions and an empty list", () => {
  assert.deepEqual(validateSleepSync({ sessions: [validSession()] }), []);
  assert.deepEqual(validateSleepSync({ sessions: [] }), []);
});

test("validateSleepSync rejects a non-array body", () => {
  assert.deepEqual(validateSleepSync({ sessions: "nope" }), ["sessions must be an array"]);
  assert.deepEqual(validateSleepSync(undefined), ["sessions must be an array"]);
});

test("validateSleepSync reports which session is bad", () => {
  const errors = validateSleepSync({ sessions: [validSession(), { ...validSession(), totalDuration: -1 }] });
  assert.ok(errors.some((e) => e.startsWith("sessions[1].totalDuration")));
  assert.ok(!errors.some((e) => e.startsWith("sessions[0]")));
});

test("validateSleepSync rejects an end date before the start date", () => {
  const errors = validateSleepSync({
    sessions: [{ ...validSession(), startDate: "2026-10-04T07:00:00Z", endDate: "2026-10-03T23:00:00Z" }],
  });
  assert.ok(errors.some((e) => e.includes("endDate must be after startDate")));
});