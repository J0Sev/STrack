import sax from "sax";

const SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";
const VALUE_PREFIX = "HKCategoryValueSleepAnalysis";

export function parseHealthDate(text) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/.exec(text ?? "");
  if (!m) return null;
  const date = new Date(`${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function stageFromValue(value) {
  const name = (value ?? "").replace(VALUE_PREFIX, "");
  switch (name) {
    case "InBed": return "inBed";
    case "Awake": return "awake";
    case "AsleepCore": return "core";
    case "AsleepDeep": return "deep";
    case "AsleepREM": return "rem";
    case "AsleepUnspecified":
    case "Asleep": return "asleep";
    default: return null;
  }
}

/**
 * Streams an Apple Health export.xml and resolves to the sleep records only:
 * [{ source, stage, start, end }]. Everything else in the file is skipped.
 * @param {import("node:stream").Readable} readable
 */
export function parseSleepRecords(readable) {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = sax.createStream(true);

    parser.on("opentag", (node) => {
      if (node.name !== "Record" || node.attributes.type !== SLEEP_TYPE) return;

      const start = parseHealthDate(node.attributes.startDate);
      const end = parseHealthDate(node.attributes.endDate);
      const stage = stageFromValue(node.attributes.value);
      if (!start || !end || !stage || end <= start) return;

      records.push({ source: node.attributes.sourceName ?? "unknown", stage, start, end });
    });

    parser.on("error", reject);
    parser.on("end", () => resolve(records));
    readable.on("error", reject);
    readable.pipe(parser);
  });
}
