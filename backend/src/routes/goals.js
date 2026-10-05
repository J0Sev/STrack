import { Router } from "express";
import { pool } from "../db/pool.js";
import { getDefaultUserId } from "../db/defaultUser.js";
import { validateGoal } from "../validate.js";


export const goalsRouter = Router();

function toMinutes(components) {
  return (components.hour ?? 0) * 60 + (components.minute ?? 0);
}

function toComponents(minutes) {
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

goalsRouter.post("/", async (req, res) => {
  const { id, targetDurationHours, targetBedtime, targetWakeTime } = req.body;
  const errors = validateGoal(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });

  try {
    const userId = await getDefaultUserId();
    await pool.query("UPDATE goals SET is_active = false WHERE user_id = $1", [userId]);
    await pool.query(
      `INSERT INTO goals (id, user_id, target_duration_hours, target_bedtime_minutes, target_wake_minutes, is_active)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [id, userId, targetDurationHours, toMinutes(targetBedtime), toMinutes(targetWakeTime)]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save goal" });
  }
});

goalsRouter.get("/active", async (req, res) => {
  try {
    const userId = await getDefaultUserId();
    const result = await pool.query(
      "SELECT * FROM goals WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "No active goal" });

    const row = result.rows[0];
    res.json({
      id: row.id,
      targetDurationHours: Number(row.target_duration_hours),
      targetBedtime: toComponents(row.target_bedtime_minutes),
      targetWakeTime: toComponents(row.target_wake_minutes),
      isActive: row.is_active,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load goal" });
  }
});
