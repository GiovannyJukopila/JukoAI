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

-- Fase 4: Social Studio — columnas nuevas sobre las tablas Phase-2 existentes.
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS handle text;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS access_token_enc text;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS refresh_token_enc text;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS scopes text;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS meta jsonb;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS retries integer NOT NULL DEFAULT 0;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS social_posts_sched_idx ON social_posts (scheduled_for);

-- Fase 5: Radar IA (top trends, refresh manual).
CREATE TABLE IF NOT EXISTS radar_runs (
  id serial PRIMARY KEY,
  status text NOT NULL DEFAULT 'ok',
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  stats jsonb
);
CREATE TABLE IF NOT EXISTS radar_items (
  id serial PRIMARY KEY,
  run_id integer NOT NULL REFERENCES radar_runs(id) ON DELETE CASCADE,
  topic text NOT NULL,
  source text NOT NULL,
  title text NOT NULL,
  summary text,
  url text,
  sentiment text,
  relevance integer,
  published_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS radar_items_run_idx ON radar_items (run_id);
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(DDL);
    console.log("✅ app-migrate: notifications + social studio listo.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ app-migrate falló:", err);
  process.exit(1);
});
