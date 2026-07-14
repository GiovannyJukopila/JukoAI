/**
 * Idempotent DDL for the Content Intelligence Center tables.
 *
 * drizzle-kit generate needs a TTY (interactive rename resolution) which isn't
 * available here, and our changes are purely additive, so we apply the CREATE
 * TABLE statements directly. Safe to re-run: every statement is IF NOT EXISTS.
 */
import "@/server/config/load-env";
import { pool } from "@/server/db/client";

const DDL = `
CREATE TABLE IF NOT EXISTS content_sources (
  id serial PRIMARY KEY,
  platform text NOT NULL,
  kind text NOT NULL,
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  requires_key boolean NOT NULL DEFAULT false,
  config jsonb,
  cadence_minutes integer NOT NULL DEFAULT 360,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS content_sources_platform_label_uniq ON content_sources (platform, label);

CREATE TABLE IF NOT EXISTS raw_signals (
  id serial PRIMARY KEY,
  source_id integer NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_id text,
  url text,
  title text,
  body text,
  author text,
  lang text,
  region text,
  metrics jsonb,
  keywords jsonb,
  content_hash text NOT NULL,
  observed_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS raw_signals_source_hash_uniq ON raw_signals (source_id, content_hash);
CREATE INDEX IF NOT EXISTS raw_signals_platform_idx ON raw_signals (platform);
CREATE INDEX IF NOT EXISTS raw_signals_fetched_idx ON raw_signals (fetched_at);

CREATE TABLE IF NOT EXISTS trends (
  id serial PRIMARY KEY,
  slug text NOT NULL,
  title text NOT NULL,
  summary text,
  category text,
  platforms jsonb,
  lang text,
  region text,
  status text NOT NULL DEFAULT 'emerging',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS trends_slug_uniq ON trends (slug);
CREATE INDEX IF NOT EXISTS trends_status_idx ON trends (status);

CREATE TABLE IF NOT EXISTS trend_evidence (
  id serial PRIMARY KEY,
  trend_id integer NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  raw_signal_id integer NOT NULL REFERENCES raw_signals(id) ON DELETE CASCADE,
  weight real NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS trend_evidence_uniq ON trend_evidence (trend_id, raw_signal_id);

CREATE TABLE IF NOT EXISTS trend_scores (
  id serial PRIMARY KEY,
  trend_id integer NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'v1',
  momentum integer,
  volume integer,
  cross_platform integer,
  competition integer,
  evergreen integer,
  confidence integer,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trend_scores_trend_idx ON trend_scores (trend_id);

CREATE TABLE IF NOT EXISTS trend_observations (
  id serial PRIMARY KEY,
  trend_id integer NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  volume integer NOT NULL DEFAULT 0,
  engagement integer NOT NULL DEFAULT 0,
  sources_count integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS trend_observations_trend_idx ON trend_observations (trend_id);

CREATE TABLE IF NOT EXISTS intel_jobs (
  id serial PRIMARY KEY,
  kind text NOT NULL,
  business_id integer REFERENCES businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendiente',
  stats jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  total_cost_usd numeric(12,6) NOT NULL DEFAULT '0',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intel_jobs_kind_idx ON intel_jobs (kind);
CREATE INDEX IF NOT EXISTS intel_jobs_status_idx ON intel_jobs (status);

CREATE TABLE IF NOT EXISTS intel_job_tasks (
  id serial PRIMARY KEY,
  job_id integer NOT NULL REFERENCES intel_jobs(id) ON DELETE CASCADE,
  business_id integer REFERENCES businesses(id) ON DELETE CASCADE,
  agent text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente',
  result jsonb,
  error_message text,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(12,6) NOT NULL DEFAULT '0',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intel_job_tasks_job_idx ON intel_job_tasks (job_id);

CREATE TABLE IF NOT EXISTS content_opportunities (
  id serial PRIMARY KEY,
  business_id integer NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  trend_id integer REFERENCES trends(id) ON DELETE SET NULL,
  job_id integer REFERENCES intel_jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  hook text,
  first_3s text,
  script jsonb,
  cta text,
  thumbnail_concept text,
  platform text,
  duration_seconds integer,
  difficulty text,
  production_cost text,
  editing jsonb,
  business_fit integer,
  virality_score integer,
  competition_score integer,
  trend_confidence integer,
  trend_momentum integer,
  evergreen_score integer,
  seo_opportunity integer,
  keywords jsonb,
  hashtags jsonb,
  posting_time text,
  frequency text,
  repurposing jsonb,
  reasoning text,
  status text NOT NULL DEFAULT 'borrador',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_opportunities_business_idx ON content_opportunities (business_id);
CREATE INDEX IF NOT EXISTS content_opportunities_status_idx ON content_opportunities (status);

CREATE TABLE IF NOT EXISTS opportunity_evidence (
  id serial PRIMARY KEY,
  opportunity_id integer NOT NULL REFERENCES content_opportunities(id) ON DELETE CASCADE,
  raw_signal_id integer REFERENCES raw_signals(id) ON DELETE SET NULL,
  trend_id integer REFERENCES trends(id) ON DELETE SET NULL,
  note text
);
CREATE INDEX IF NOT EXISTS opportunity_evidence_opp_idx ON opportunity_evidence (opportunity_id);

CREATE TABLE IF NOT EXISTS claude_ideas (
  id serial PRIMARY KEY,
  trend_id integer REFERENCES trends(id) ON DELETE CASCADE,
  job_id integer REFERENCES intel_jobs(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'video',
  title text NOT NULL,
  hook text,
  claude_impl text,
  combo text,
  platform text,
  steps jsonb,
  impact text,
  difficulty text,
  status text NOT NULL DEFAULT 'nueva',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS claude_ideas_trend_idx ON claude_ideas (trend_id);
CREATE INDEX IF NOT EXISTS claude_ideas_status_idx ON claude_ideas (status);
`;

async function main() {
  await pool.query(DDL);
  const { rows } = await pool.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name like 'trend%' or table_name in
     ('content_sources','raw_signals','intel_jobs','intel_job_tasks') order by table_name`,
  );
  console.log("✅ Content Intel tables ready:", rows.map((r) => r.table_name).join(", "));
  await pool.end();
}

main().catch((e) => {
  console.error("❌ intel-migrate failed:", e);
  process.exit(1);
});
