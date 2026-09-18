import { pool } from "./pool.js";

// v1 has no auth — everything belongs to a single bootstrapped user.
let cachedUserId = null;

export async function getDefaultUserId() {
  if (cachedUserId) return cachedUserId;

  const existing = await pool.query("SELECT id FROM users ORDER BY created_at LIMIT 1");
  if (existing.rows.length > 0) {
    cachedUserId = existing.rows[0].id;
    return cachedUserId;
  }

  const created = await pool.query("INSERT INTO users DEFAULT VALUES RETURNING id");
  cachedUserId = created.rows[0].id;
  return cachedUserId;
}
