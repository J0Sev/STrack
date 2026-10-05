// Each validator takes a parsed JSON body and returns an array of human-readable
// error strings. An empty array means the body is valid. Routes respond with a
// 400 and the list of errors when the array is non-empty, so the client can tell
// "you sent bad data" (400) apart from "the server broke" (500).

const GOAL_MIN_HOURS = 4;
const GOAL_MAX_HOURS = 12;
const MAX_NOTES_LENGTH = 1000;
const MAX_SCREEN_TIME_MINUTES = 24 * 60;
const MAX_SESSION_SECONDS = 24 * 60 * 60;

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function isIntInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateTimeOfDay(name, value, errors) {
  if (!value || typeof value !== "object") {
    errors.push(`${name} must be an object like { hour: 0-23, minute: 0-59 }`);
    return;
  }
  if (!isIntInRange(value.hour, 0, 23)) errors.push(`${name}.hour must be an integer 0-23`);
  if (!isIntInRange(value.minute, 0, 59)) errors.push(`${name}.minute must be an integer 0-59`);
}

export function validateGoal(body) {
  const errors = [];
  const { id, targetDurationHours, targetBedtime, targetWakeTime } = body ?? {};

  if (!isNonEmptyString(id)) errors.push("id must be a non-empty string");

  if (
    typeof targetDurationHours !== "number" ||
    Number.isNaN(targetDurationHours) ||
    targetDurationHours < GOAL_MIN_HOURS ||
    targetDurationHours > GOAL_MAX_HOURS
  ) {
    errors.push(`targetDurationHours must be a number between ${GOAL_MIN_HOURS} and ${GOAL_MAX_HOURS}`);
  }

  validateTimeOfDay("targetBedtime", targetBedtime, errors);
  validateTimeOfDay("targetWakeTime", targetWakeTime, errors);

  return errors;
}

export function validateCheckIn(body) {
  const errors = [];
  const {
    id,
    date,
    caffeineAfter2pm,
    screenTimeBeforeBedMinutes,
    alcohol,
    exercisedToday,
    stressLevel,
    notes,
  } = body ?? {};

  if (!isNonEmptyString(id)) errors.push("id must be a non-empty string");
  if (!isIsoDate(date)) errors.push("date must be an ISO 8601 date string");

  // Booleans are optional (the DB defaults them to false) but must be real
  // booleans if present, so that "false" the string never counts as true.
  for (const [name, value] of [
    ["caffeineAfter2pm", caffeineAfter2pm],
    ["alcohol", alcohol],
    ["exercisedToday", exercisedToday],
  ]) {
    if (value != null && typeof value !== "boolean") errors.push(`${name} must be a boolean`);
  }

  if (screenTimeBeforeBedMinutes != null && !isIntInRange(screenTimeBeforeBedMinutes, 0, MAX_SCREEN_TIME_MINUTES)) {
    errors.push(`screenTimeBeforeBedMinutes must be an integer 0-${MAX_SCREEN_TIME_MINUTES}`);
  }

  if (stressLevel != null && !isIntInRange(stressLevel, 1, 5)) {
    errors.push("stressLevel must be an integer 1-5");
  }

  if (notes != null) {
    if (typeof notes !== "string") errors.push("notes must be a string");
    else if (notes.length > MAX_NOTES_LENGTH) errors.push(`notes must be at most ${MAX_NOTES_LENGTH} characters`);
  }

  return errors;
}

export function validateSleepSync(body) {
  const errors = [];
  const sessions = body?.sessions;

  if (!Array.isArray(sessions)) return ["sessions must be an array"];

  sessions.forEach((s, i) => {
    const at = `sessions[${i}]`;
    if (!isNonEmptyString(s?.id)) errors.push(`${at}.id must be a non-empty string`);
    if (!isIsoDate(s?.startDate)) errors.push(`${at}.startDate must be an ISO 8601 date string`);
    if (!isIsoDate(s?.endDate)) errors.push(`${at}.endDate must be an ISO 8601 date string`);

    if (isIsoDate(s?.startDate) && isIsoDate(s?.endDate) && Date.parse(s.endDate) <= Date.parse(s.startDate)) {
      errors.push(`${at}.endDate must be after startDate`);
    }

    for (const field of ["totalDuration", "timeInBed"]) {
      if (typeof s?.[field] !== "number" || s[field] < 0 || s[field] > MAX_SESSION_SECONDS) {
        errors.push(`${at}.${field} must be a number of seconds between 0 and ${MAX_SESSION_SECONDS}`);
      }
    }

    for (const field of ["coreDuration", "deepDuration", "remDuration", "awakeDuration"]) {
      const v = s?.[field];
      if (v != null && (typeof v !== "number" || v < 0 || v > MAX_SESSION_SECONDS)) {
        errors.push(`${at}.${field} must be a number of seconds between 0 and ${MAX_SESSION_SECONDS}`);
      }
    }
  });

  return errors;
}