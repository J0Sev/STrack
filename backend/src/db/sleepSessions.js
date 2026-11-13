import { pool } from "./pool.js";

const roundOrNull = (v) => (v != null ? Math.round(v) : null);

/** Inserts or updates sleep sessions in one transaction, keyed on (user_id, start_date). */
export async function upsertSessions(userId, sessions) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const s of sessions) {
      await client.query(
        `INSERT INTO sleep_sessions
          (id, user_id, start_date, end_date, total_duration_seconds, time_in_bed_seconds,
           core_duration_seconds, deep_duration_seconds, rem_duration_seconds, awake_duration_seconds)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (user_id, start_date) DO UPDATE SET
           end_date = EXCLUDED.end_date,
           total_duration_seconds = EXCLUDED.total_duration_seconds,
           time_in_bed_seconds = EXCLUDED.time_in_bed_seconds,
           core_duration_seconds = EXCLUDED.core_duration_seconds,
           deep_duration_seconds = EXCLUDED.deep_duration_seconds,
           rem_duration_seconds = EXCLUDED.rem_duration_seconds,
           awake_duration_seconds = EXCLUDED.awake_duration_seconds`,
        [
          s.id,
          userId,
          s.startDate,
          s.endDate,
          Math.round(s.totalDuration),
          Math.round(s.timeInBed),
          roundOrNull(s.coreDuration),
          roundOrNull(s.deepDuration),
          roundOrNull(s.remDuration),
          roundOrNull(s.awakeDuration),
        ]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
