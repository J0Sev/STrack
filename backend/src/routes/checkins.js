import { Router } from "express";
import { pool } from "../db/pool.js";
import { getDefaultUserId } from "../db/defaultUser.js";
import { generateSuggestions } from "../services/suggestionEngine.js";
import { validateCheckIn } from "../validate.js";

export const checkinsRouter = Router();

checkinsRouter.post("/", async (req, res) => {
  const errors = validateCheckIn(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });
  const { id, date, caffeineAfter2pm, screenTimeBeforeBedMinutes, alcohol, exercisedToday, stressLevel, notes } =
    req.body;

  try {
    const userId = await getDefaultUserId();
    await pool.query(
      `INSERT INTO check_ins
        (id, user_id, date, caffeine_after_2pm, screen_time_before_bed_minutes, alcohol, exercised_today, stress_level, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, userId, date, !!caffeineAfter2pm, screenTimeBeforeBedMinutes ?? null, !!alcohol, !!exercisedToday, stressLevel ?? null, notes ?? null]
    );

    const suggestions = generateSuggestions({
      caffeineAfter2pm,
      screenTimeBeforeBedMinutes,
      alcohol,
      exercisedToday,
      stressLevel,
    });

    res.status(201).json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save check-in" });
  }
});
