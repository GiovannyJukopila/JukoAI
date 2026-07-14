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

-- Fase 6: Kanban de tareas.
CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  assigned_to text,
  created_by text NOT NULL,
  "column" text NOT NULL DEFAULT 'backlog',
  sort_order integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'media',
  due_date timestamptz,
  labels jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_column_idx ON tasks ("column", sort_order);
CREATE TABLE IF NOT EXISTS task_comments (
  id serial PRIMARY KEY,
  task_id integer NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id);
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(DDL);
    console.log("✅ app-migrate: notifications + social + radar + tasks listo.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ app-migrate falló:", err);
  process.exit(1);
});
