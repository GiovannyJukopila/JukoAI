/**
 * Idempotent DDL for the refactor-plan tables (notifications; tasks/goals will
 * join in later phases). Same pattern as intel-migrate.ts: drizzle-kit needs a
 * TTY and the historical migrations drifted from schema.ts, so purely-additive
 * changes are applied directly. Safe to re-run: everything is IF NOT EXISTS.
 *
 * Run with: npm run app:migrate
 */
import "@/server/config/load-env";
import { pool } from "@/server/db/client";

const DDL = `
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_to text NOT NULL,
  actor text,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id integer,
  meta jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_to, read);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created_at);
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(DDL);
    console.log("✅ app-migrate: notifications listo.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ app-migrate falló:", err);
  process.exit(1);
});
