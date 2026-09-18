import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "..", "migrations");

async function run() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'); // for gen_random_uuid()

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
  }
  console.log("Migrations complete.");
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
