import { Router } from "express";
import { pool } from "../db/pool.js";
import { getDefaultUserId } from "../db/defaultUser.js";

export const sleepRouter = Router();

// Upsert sleep sessions synced from HealthKit on the client.
sleepRouter.post("/sync", async (req, res) => {
  const { sessions } = req.body;
  if (!Array.isArray(sessions)) {
    return res.status(400).json({ error: "sessions must be an array" });
  }

  const userId = await getDefaultUserId();

  try {
    for (const s of sessions) {
      await pool.query(
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
          s.coreDuration != null ? Math.round(s.coreDuration) : null,
          s.deepDuration != null ? Math.round(s.deepDuration) : null,
          s.remDuration != null ? Math.round(s.remDuration) : null,
          s.awakeDuration != null ? Math.round(s.awakeDuration) : null,
        ]
      );
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync sleep sessions" });
  }
});

sleepRouter.get("/recent", async (req, res) => {
  const userId = await getDefaultUserId();
  const days = Number(req.query.days ?? 14);

  const result = await pool.query(
    `SELECT * FROM sleep_sessions
     WHERE user_id = $1 AND start_date >= now() - ($2 || ' days')::interval
     ORDER BY start_date DESC`,
    [userId, days]
  );
  res.json(result.rows);
});
