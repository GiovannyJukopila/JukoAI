# Content Intelligence Center — Architecture Design

> A new subsystem inside **Juko Prospect**. It continuously ingests real signals from
> the open internet, distills them into **validated, evidence-backed trends**, and
> transforms them into **business-specific content & video opportunities** for each lead.
>
> It reuses the existing agent architecture exactly: every AI call goes through
> `runStructured` → `AI_PROVIDER=cli` → `claude -p` on the Pro/Max **subscription**.
> No Anthropic API. No OpenAI. No LangChain. No external orchestration framework.
> No message broker. Postgres + Drizzle + Next.js route handlers + `tsx` scripts, same as today.

Status: **design (converged after 3 self-critique iterations)** · Owner: Juko Labs · Target module: `/prospect/intel`

---

## 0. The one idea that makes this honest

The hard requirement — *"never invent trends, never fabricate metrics, always attach evidence"* —
is not a prompt instruction. It is an **architectural boundary**:

```
COLLECTORS (deterministic code, no LLM)  →  raw_signals  (the evidence ledger, real URLs + timestamps + metrics)
                                                  │
AGENTS (LLM via claude -p, no tools, no browsing) │  reason ONLY over rows we already fetched
                                                  ▼
        trends / content_opportunities  ──── every row FK-linked back to raw_signals it cites
                                                  │
EVIDENCE-GUARD (deterministic validator)  ────────┘  rejects any output whose cited signal ids / URLs
                                                     are not present in the input evidence set
```

The LLM **never fetches anything and never emits a number that wasn't derived from a collected metric.**
All popularity/volume/engagement figures come from `raw_signals.metrics`. The model's job is
*clustering, interpretation, matching, and creative generation over evidence we can point to.*
This single boundary is why the system cannot hallucinate a trend: a trend with no `trend_evidence`
rows is invalid by construction, and an opportunity citing a URL not in `raw_signals` is rejected before it is ever shown.

This is also why it fits the CLI provider perfectly: `runViaCli` already runs with `--allowedTools ""`,
`--max-turns 1`, deterministic JSON output. The model is a pure function of `(system, evidence) → JSON`.

---

## 1. High-Level Vision

Juko Prospect already answers *"which businesses are good leads and what's wrong with them."*
The Content Intelligence Center (CIC) answers the next two questions:

1. **What is happening on the internet right now** that a business could ride? (global trend radar)
2. **What exactly should *this specific* business film/post this week** to ride it? (per-lead opportunities)

The felt experience is "HubSpot × Semrush × Exploding Topics × TikTok Creative Center", but the
implementation is deliberately small: a couple of scheduled `tsx` pipelines, a handful of new agents
that reuse `BaseAgent`, ~10 new Drizzle tables, one new dashboard section, all evidence-first.

**Non-goals (explicit):** we do not build a message bus, a microservice mesh, a vector database
cluster, or a paid-data dependency. We build an honest intelligence layer on the infrastructure that
already exists, with clean seams where scale would later demand more.

---

## 2. Architecture Overview

Two macro-pipelines, mirroring the existing `Research → Audit → Copywriting` philosophy.

### Pipeline A — Signal Intelligence (global, scheduled, business-agnostic)

```
cron/tsx ─▶ Collect ─▶ Normalize+Dedup ─▶ [Agent] Trend Synthesis ─▶ [Agent] Trend Validation
             (code)        (code)              (cluster signals→trends)     (cross-source corroborate)
                                                        │
                              Deterministic Scoring ◀───┘ ─▶ persist trends + trend_evidence + trend_scores + trend_observations
```

Runs on a schedule (e.g. every 3–6h). Produces the shared **trend corpus**. Never touches a lead.

### Pipeline B — Opportunity Generation (per-lead, on-demand or batch)

```
POST /intel/leads/:id/opportunities ─▶ Build Business Context (reuse existing research/audit rows, code)
   ─▶ [Agent] Trend↔Business Matcher (rank corpus trends for this business, with reasons)
   ─▶ [Agent] Content Strategist (choose formats/angles per matched trend)
   ─▶ [Agent] Creative Director (hook, first-3s, script, thumbnail, editing, CTA)
   ─▶ Deterministic Scoring (fit/competition/effort) + Evidence-Guard
   ─▶ persist content_opportunities + opportunity_evidence
```

Mirrors `runPipeline()` **exactly**: one `intel_jobs` run row, one `intel_job_tasks` row per agent
(`pendiente → en_progreso → completada/error`), resilient (a failing agent degrades gracefully), outputs
persisted to domain tables. The Operations Center renders both pipelines from the same telemetry shape.

### Where each concern lives

| Concern | Mechanism (reused) |
|---|---|
| AI calls | `runStructured` → `runViaCli` (`claude -p`) — unchanged |
| Agent contract | extend `BaseAgent<TInput,TOutput>` — unchanged |
| Run/step telemetry | `intel_jobs` + `intel_job_tasks` (shape-identical to `pipeline_runs`/`agent_tasks`) |
| Token/cost logging | `logApiUsage` → `api_usage` — unchanged |
| HTTP fetching | `@/server/lib/http` `fetchText` (timeouts/retries/SSRF guards) — unchanged |
| Scheduling / workers | `tsx src/scripts/*.ts` under cron — same pattern as `scrape`/`audit`/`pipeline` |
| Concurrency guard | Postgres advisory lock + `status='running'` row (same idea as coverage `en_progreso`) |
| Persistence | Drizzle + Postgres, text-enums, `numeric(12,6)`, jsonb `$type` — unchanged conventions |
| Dashboard | new `/prospect/intel/*` pages reusing the chart/viz primitives and the new sidebar |

---

## 3. Folder Structure

Additions only; everything nests under the existing tree and naming conventions.

```
src/
  server/
    services/
      intel/
        sources/                      # COLLECTORS — deterministic fetchers, NO LLM
          types.ts                    # Source interface, RawSignalInput, CollectContext
          registry.ts                 # enabled sources from content_sources + env keys
          googleTrends.ts             # daily/realtime RSS + related queries (free)
          googleNews.ts               # Google News RSS by topic/keyword (free)
          reddit.ts                   # per-subreddit / search .json (free, UA-gated)
          hackerNews.ts               # Algolia HN API (free)
          youtube.ts                  # channel/search RSS feeds (free)
          productHunt.ts              # RSS / GraphQL (free token)
          githubTrending.ts           # trending mirror feed (free)
          rss.ts                      # generic RSS/Atom (blogs, newsletters)
          _paid/                      # require keys → disabled until configured
            tiktok.ts  instagram.ts  metaAdsLibrary.ts  semrush.ts  ...
        collect.ts                    # orchestrates a collection run (all enabled sources)
        normalize.ts                  # clean, hash, dedup, language/region detect
        synthesize.ts                 # Pipeline A driver (Synthesis→Validation→score→persist)
        scoring/
          trendScores.ts              # momentum, volume, cross-platform, confidence, evergreen
          opportunityScores.ts        # business fit, competition, effort/cost
          index.ts
        opportunities.ts              # Pipeline B driver (context→match→strategy→creative→QA)
        evidenceGuard.ts              # deterministic anti-hallucination validator
        calendar.ts                   # slot planning → social_posts drafts
        repository.ts                 # read models for the dashboard
        jobs.ts                       # intel_jobs/intel_job_tasks helpers (mirror orchestrator)
      ai/
        agents/
          intel/
            trendSynthesis.ts
            trendValidation.ts
            trendClassify.ts
            businessMatch.ts
            contentStrategy.ts
            creativeDirector.ts
            opportunityQa.ts          # LLM QA (paired with deterministic evidenceGuard)
  app/
    api/prospect/intel/
      trends/route.ts                 # GET list (filters)   trends/[id]/route.ts  GET detail
      opportunities/route.ts          # GET queue            opportunities/[id]/route.ts  PATCH status
      leads/[id]/opportunities/route.ts   # POST generate for a lead
      sources/route.ts                # GET/PATCH collector registry (admin)
      calendar/route.ts               # GET plan   PATCH schedule
      collect/route.ts                # POST admin-trigger a collection run (guarded)
      jobs/route.ts                   # GET intel job feed (operations)
    prospect/intel/
      page.tsx                        # Trend Radar (default)
      trends/[id]/page.tsx            # Trend detail (momentum + evidence)
      opportunities/page.tsx          # Global opportunity queue
      calendar/page.tsx               # Content calendar
      sources/page.tsx                # Collector health/admin
      _components/…                   # TrendCard, EvidenceList, OpportunityCard, MomentumSpark…
  scripts/
    intel-collect.ts                  # cron: run enabled collectors → raw_signals
    intel-synthesize.ts               # cron: Pipeline A over recent signals
    intel-opportunities.ts            # cron/manual: Pipeline B for a lead cohort
```

---

## 4. Database Design

Design principles inherited from the existing schema: **text columns for enums** (documented allowed
values, so new statuses never need `ALTER TYPE`), `numeric(12,6)` for money, `integer` for tokens,
`jsonb().$type<>()` for structured blobs, `serial` PKs, `withTimezone` timestamps, `uniqueIndex` for
idempotency and `index` for hot filters.

Core tables and *why each exists*:

| Table | Purpose | Growth class |
|---|---|---|
| `content_sources` | registry of collectors: platform, kind, enabled, config, cadence, health | tiny (dozens) |
| `raw_signals` | **the evidence ledger** — every fetched item with URL, metrics, hashes, timestamps | large / append-only |
| `trends` | validated, de-duplicated trend entities with lifecycle status | medium |
| `trend_evidence` | M:N `trends ↔ raw_signals` — *proves* each trend; weight per link | large |
| `trend_observations` | time-series of a trend's aggregate strength → momentum/decay curves | large / append-only |
| `trend_scores` | **versioned** score snapshots per trend (method + computed_at) | medium |
| `content_opportunities` | per-business generated opportunity + full blueprint + scores + status | medium |
| `opportunity_evidence` | provenance for each opportunity (→ trend and/or raw_signal) | medium |
| `content_plans` | calendar slots per business; publishes into existing `social_posts` | small |
| `intel_jobs` / `intel_job_tasks` | run/step telemetry for both pipelines (mirror of pipeline_runs/agent_tasks) | medium |
| `intel_events` | append-only event/outbox ledger decoupling pipeline stages | large / append-only |
| `llm_cache` | `(agent, input_hash) → output` cache to spare subscription rate limit | medium |

**Scale posture (honest):** this is an internal tool on a personal subscription; today's volumes are
small. But the shapes are chosen so the append-only tables (`raw_signals`, `trend_observations`,
`intel_events`) can be **range-partitioned by month** and TTL-pruned without touching application code
— that is the scale seam. We do not pre-build partitioning; we make it a one-migration change.

---

## 5. Drizzle Models

New enum vocabularies (append to `src/server/db/schema.ts` — text columns, so purely additive):

```ts
export const TREND_STATUS = ["emerging","rising","peaking","declining","evergreen","dormant"] as const;
export type TrendStatus = (typeof TREND_STATUS)[number];

export const OPPORTUNITY_STATUS = ["borrador","aprobada","programada","publicada","descartada"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[number];

export const SOURCE_KIND = ["trends","social","search","news","forum","catalog","rss"] as const;
export type SourceKind = (typeof SOURCE_KIND)[number];

// Extend the existing AGENT_KIND (still a text column — no migration needed):
//   ...existing: research, audit_seo, copywriting, orchestrator
//   + trend_synthesis, trend_validation, trend_classify,
//   + business_match, content_strategy, creative_director, opportunity_qa, intel_orchestrator
```

Representative tables (abbreviated but faithful to house style):

```ts
export const contentSources = pgTable("content_sources", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),          // "google_trends","reddit","youtube",...
  kind: text("kind").notNull(),                   // SourceKind
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  requiresKey: boolean("requires_key").notNull().default(false),
  config: jsonb("config").$type<Record<string, unknown>>(), // subreddits, topics, feed urls…
  cadenceMinutes: integer("cadence_minutes").notNull().default(360),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("content_sources_platform_uniq").on(t.platform, t.label)]);

export const rawSignals = pgTable("raw_signals", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => contentSources.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),           // denormalized for fast filters
  externalId: text("external_id"),                // stable id at the source, if any
  url: text("url"),                               // the real, citable link (evidence)
  title: text("title"),
  body: text("body"),
  author: text("author"),
  lang: text("lang"),
  region: text("region"),
  // ALL popularity numbers live here and ONLY here (views, upvotes, search index, growth%…)
  metrics: jsonb("metrics").$type<Record<string, number>>(),
  keywords: jsonb("keywords").$type<string[]>(),
  contentHash: text("content_hash").notNull(),    // dedup key (normalized title+url+source)
  observedAt: timestamp("observed_at", { withTimezone: true }),  // when it was true at the source
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  raw: jsonb("raw"),                              // untouched payload snapshot
}, (t) => [
  uniqueIndex("raw_signals_source_hash_uniq").on(t.sourceId, t.contentHash),
  index("raw_signals_platform_idx").on(t.platform),
  index("raw_signals_fetched_idx").on(t.fetchedAt),
]);

export const trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),                   // stable identity for dedup/merge
  title: text("title").notNull(),
  summary: text("summary"),
  category: text("category"),                     // maps to business categories where possible
  platforms: jsonb("platforms").$type<string[]>(),// where it was observed
  lang: text("lang"), region: text("region"),
  status: text("status").notNull().default("emerging"), // TrendStatus
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("trends_slug_uniq").on(t.slug), index("trends_status_idx").on(t.status)]);

export const trendEvidence = pgTable("trend_evidence", {
  id: serial("id").primaryKey(),
  trendId: integer("trend_id").notNull().references(() => trends.id, { onDelete: "cascade" }),
  rawSignalId: integer("raw_signal_id").notNull().references(() => rawSignals.id, { onDelete: "cascade" }),
  weight: real("weight").notNull().default(1),
}, (t) => [uniqueIndex("trend_evidence_uniq").on(t.trendId, t.rawSignalId)]);

export const trendScores = pgTable("trend_scores", {
  id: serial("id").primaryKey(),
  trendId: integer("trend_id").notNull().references(() => trends.id, { onDelete: "cascade" }),
  method: text("method").notNull().default("v1"), // versioned scoring model
  momentum: integer("momentum"),        // 0-100, EMA of volume growth
  volume: integer("volume"),            // 0-100, normalized cross-source volume
  crossPlatform: integer("cross_platform"), // distinct platforms corroborating
  competition: integer("competition"),  // 0-100, saturation (higher = more crowded)
  evergreen: integer("evergreen"),      // 0-100, persistence vs spike
  confidence: integer("confidence"),    // 0-100, f(sources, corroboration, recency, trust)
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("trend_scores_trend_idx").on(t.trendId)]);

export const contentOpportunities = pgTable("content_opportunities", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  trendId: integer("trend_id").references(() => trends.id, { onDelete: "set null" }),
  jobId: integer("job_id").references(() => intelJobs.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  hook: text("hook"),
  first3s: text("first_3s"),
  script: jsonb("script").$type<{ beat: string; onScreen?: string; voiceover?: string }[]>(),
  cta: text("cta"),
  thumbnailConcept: text("thumbnail_concept"),
  openingShot: text("opening_shot"),
  editing: jsonb("editing").$type<string[]>(),
  platform: text("platform"),
  durationSeconds: integer("duration_seconds"),
  difficulty: text("difficulty"),                 // baja | media | alta
  productionCost: text("production_cost"),         // baja | media | alta
  // scores — fit/competition/effort come from code; virality/momentum inherit from trend_scores
  businessFit: integer("business_fit"),
  viralityScore: integer("virality_score"),
  competitionScore: integer("competition_score"),
  trendConfidence: integer("trend_confidence"),
  trendMomentum: integer("trend_momentum"),
  evergreenScore: integer("evergreen_score"),
  seoOpportunity: integer("seo_opportunity"),
  keywords: jsonb("keywords").$type<string[]>(),
  hashtags: jsonb("hashtags").$type<string[]>(),
  postingTime: text("posting_time"),
  frequency: text("frequency"),
  repurposing: jsonb("repurposing").$type<string[]>(),
  reasoning: text("reasoning"),                    // why this fits THIS business
  status: text("status").notNull().default("borrador"), // OpportunityStatus
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("content_opportunities_business_idx").on(t.businessId),
  index("content_opportunities_status_idx").on(t.status),
]);

export const opportunityEvidence = pgTable("opportunity_evidence", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull().references(() => contentOpportunities.id, { onDelete: "cascade" }),
  rawSignalId: integer("raw_signal_id").references(() => rawSignals.id, { onDelete: "set null" }),
  trendId: integer("trend_id").references(() => trends.id, { onDelete: "set null" }),
  note: text("note"),
}, (t) => [index("opportunity_evidence_opp_idx").on(t.opportunityId)]);

// intelJobs / intelJobTasks mirror pipeline_runs / agent_tasks (businessId nullable for global runs).
export const intelJobs = pgTable("intel_jobs", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),                    // "collect" | "synthesize" | "opportunities"
  businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pendiente"),
  stats: jsonb("stats").$type<Record<string, number>>(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("intel_jobs_kind_idx").on(t.kind), index("intel_jobs_status_idx").on(t.status)]);
```

`trend_observations`, `content_plans`, `intel_events`, `llm_cache`, and `intelJobTasks` follow the
same idioms (omitted here for brevity; specified in §13–§16, §30). A migration is generated with
`npm run db:generate` and applied with `npm run db:migrate` — the existing workflow, untouched.

---

## 6. AI Agent Architecture

Every agent is a thin subclass of the **existing** `BaseAgent<TInput, TOutput>` (`kind`, `operation`,
`system`, `schema`, `buildUser`). It calls `runStructured`, which validates with zod and logs to
`api_usage`. That means **zero new AI plumbing** — the CLI provider, retries, token logging, and
subscription auth are inherited verbatim. Example, matching `research.ts` line-for-line in style:

```ts
export const TrendSynthesisOutputSchema = z.object({
  trends: z.array(z.object({
    slug: z.string().describe("kebab-case identidad estable del trend"),
    title: z.string(),
    summary: z.string().describe("2-3 frases, SOLO a partir de las señales provistas"),
    category: z.string().nullable(),
    platforms: z.array(z.string()),
    signalIds: z.array(z.number()).describe("ids de raw_signals que respaldan este trend — obligatorio"),
  })),
});
export type TrendSynthesisOutput = z.infer<typeof TrendSynthesisOutputSchema>;

export class TrendSynthesisAgent extends BaseAgent<TrendSynthesisInput, TrendSynthesisOutput> {
  readonly kind = "trend_synthesis" as const;
  readonly operation = "trend_synthesis";
  readonly schema = TrendSynthesisOutputSchema;
  readonly system = [
    "Eres un analista de tendencias. Recibes una lista de SEÑALES ya recopiladas (id, fuente, título, métricas).",
    "Agrupa señales que hablan del mismo fenómeno en 'trends'. NO inventes tendencias que las señales no soporten.",
    "Cada trend DEBE citar los signalIds que lo respaldan. Si algo no está en las señales, no existe.",
    "No inventes métricas ni URLs. Responde en español.",
  ].join(" ");
  buildUser(input: TrendSynthesisInput): string { /* renders the evidence table with ids */ }
}
export const trendSynthesisAgent = new TrendSynthesisAgent();
```

The evidence set is passed **inline** in `buildUser`, and the schema **forces** `signalIds`. The model
literally cannot return a trend without pointing at rows we fetched — and if it hallucinates an id,
Evidence-Guard (§31) drops it.

---

## 7. Responsibilities of Every Agent

| Agent (`kind`) | Input | Output | One job |
|---|---|---|---|
| `trend_synthesis` | recent `raw_signals` (batched) | candidate trends w/ `signalIds` | cluster raw signals into named trends |
| `trend_validation` | candidate trend + its evidence | keep/merge/reject + rationale | cross-source corroboration & sanity |
| `trend_classify` | validated trend | category, lifecycle hint, audiences | tag trends to business categories |
| `business_match` | one business context + top trends | ranked `{trendId, fit, why}` | which trends fit *this* business |
| `content_strategy` | business + a matched trend | formats/angles/series decisions | choose *what kind* of content |
| `creative_director` | business + trend + chosen format | hook, first-3s, script, thumbnail, editing, CTA | the full creative blueprint |
| `opportunity_qa` | a generated opportunity + evidence | pass/flag + reasons | LLM-side quality/honesty check |

Deterministic (non-LLM) collaborators: **Collectors** (fetch), **Normalizer** (dedup/lang), **Scoring**
(all numbers), **Evidence-Guard** (hard provenance gate), **Calendar** (slotting). Splitting "numbers &
provenance = code" from "language & creativity = LLM" is the core separation of responsibilities.

---

## 8. Agent Communication

Agents do **not** call each other. The pipeline driver (`synthesize.ts` / `opportunities.ts`) is the
only coordinator — identical to how `orchestrator.ts` sequences Research→Audit→Copywriting today.
Data flows through **typed function returns** and the **database**, not shared mutable state:

- Pipeline A: `collect() → normalize() → trendSynthesisAgent.run() → trendValidationAgent.run() → scoring → persist`.
- Pipeline B: `buildContext() → businessMatchAgent.run() → contentStrategyAgent.run() → creativeDirectorAgent.run() → scoring → evidenceGuard() → opportunityQaAgent.run() → persist`.

Stage decoupling for observability/replay is provided by `intel_events` (an append-only Postgres
outbox), **not** an in-memory bus. For today's volume the driver calls stages directly; the event rows
are the audit trail and the future seam if stages ever move to separate workers.

---

## 9. Orchestrator Flow

A near-verbatim copy of `runTracked`/`runPipeline`, generalized to nullable `businessId`:

```ts
async function runIntelTracked(agent, input, jobId, businessId /* null for global */) {
  await sleep(800);                         // same anti-burst gap the CLI provider needs
  const [task] = await db.insert(intelJobTasks)
    .values({ jobId, businessId, agent: agent.kind, status: "en_progreso", startedAt: new Date() }).returning();
  try {
    const res = await agent.run(input, { businessId: businessId ?? undefined, taskId: task.id });
    await db.update(intelJobTasks).set({ status: "completada", result: res.data, model: res.model,
      inputTokens: res.inputTokens, outputTokens: res.outputTokens, costUsd: String(res.costUsd),
      finishedAt: new Date() }).where(eq(intelJobTasks.id, task.id));
    return res;
  } catch (err) {
    await db.update(intelJobTasks).set({ status: "error", errorMessage: (err as Error).message,
      finishedAt: new Date() }).where(eq(intelJobTasks.id, task.id));
    return null;                            // resilient: pipeline continues with partial context
  }
}
```

Resilience contract (same as today): a failing agent writes an `error` task and the run continues;
`intel_jobs.status` is `completada` only if every step succeeded, else `error`. The dashboard sees
exactly what each agent did, when, and at what token cost.

---

## 10. Prompt Design

Every intel prompt follows the same skeleton the existing agents use, plus three honesty clauses baked
into the system prompt and enforced by schema + Evidence-Guard:

1. **"Only use the SIGNALS/EVIDENCE provided below. If it isn't there, it doesn't exist."**
2. **"Never output a metric or URL that isn't in the evidence. Cite `signalIds`."**
3. **"If evidence is insufficient, return fewer/no items and say why in `reasoning`."** (No forced quotas.)

Prompts are **evidence-injected**: `buildUser` renders a compact numbered table of the relevant
`raw_signals` (id, platform, title, key metric, url-host) so the model reasons over concrete rows.
Output is always JSON constrained by a zod schema (the CLI provider derives a field template from it,
exactly as `describeSchema` does today). Prompts are versioned as string constants; changing one is a
code change, reviewable in git. No dynamic prompt assembly, no tool use, no chain-of-thought leakage.

---

## 11. Dashboard UX

A fourth sidebar section, **Content Intel** (SVG icon, same `pa-nav-link` treatment as the shell built
earlier). Style: the existing "Data-Dense Dashboard" — KPI cards, `pa-card` glass surfaces, the
`charts.tsx` primitives (`HBar`, `VBars`, `Donut`) plus a small momentum sparkline.

- **Trend Radar** (`/prospect/intel`): "Trending now / Emerging / Declining" columns; filters for
  platform, category, region, lang, timeframe; each `TrendCard` shows title, momentum spark,
  cross-platform chips, confidence, and **"N sources"** that expands into real citable links. No number
  appears without an evidence affordance next to it.
- **Trend Detail** (`/intel/trends/[id]`): momentum/decay curve from `trend_observations`, the full
  `EvidenceList` (source, title, metric, fetched-at, outbound link), related trends, and "fits N of
  your businesses".
- **Opportunity Queue** (`/intel/opportunities`): global list of generated opportunities across leads,
  filterable by business/score/status, each `OpportunityCard` with the full blueprint, score bars,
  evidence popover, and actions (approve / dismiss / schedule).
- **Per-lead tab**: a new "Content" tab inside the existing lead detail — opportunities for that one
  business + a "Generate opportunities" button (POST to Pipeline B).
- **Content Calendar** (`/intel/calendar`): week/month grid of scheduled opportunities per business.
- **Sources** (`/intel/sources`): collector health — enabled toggle, last run, last error, cadence.
- **Operations**: the existing operations view unions `intel_jobs` so collector/synthesis/opportunity
  runs appear alongside the marketing pipeline, using the same status chips.

UX guardrails (from the design skill's checklist): cursor-pointer on clickables, 150–300ms hover
transitions, visible focus rings, `prefers-reduced-motion` respected, skeletons for >300ms loads,
empty states with guidance, evidence never behind more than one click, color never the only signal.

---

## 12. APIs

Route handlers under `src/app/api/prospect/intel/*`, following the house pattern
(`export const dynamic = "force-dynamic"`, `ok()/badRequest()/handleError()/parseId()`, `maxDuration`
for long ones), all behind the existing auth gate.

| Method & path | Purpose |
|---|---|
| `GET /intel/trends?platform&category&region&status&window` | trend radar list (paginated) |
| `GET /intel/trends/:id` | trend detail + evidence + observations |
| `POST /intel/leads/:id/opportunities` | run Pipeline B for one lead (`maxDuration=300`) |
| `GET /intel/opportunities?businessId&status&minScore` | opportunity queue |
| `PATCH /intel/opportunities/:id` | change status (approve/dismiss/schedule) |
| `GET /intel/calendar?businessId&month` · `PATCH /intel/calendar/:id` | plan / schedule |
| `GET /intel/sources` · `PATCH /intel/sources/:id` | collector admin (enable, config) |
| `POST /intel/collect` | admin-trigger a collection run (advisory-lock guarded) |
| `GET /intel/jobs` | intel job feed for the operations view |

Reads are cheap and cacheable; writes that spend the subscription (`/opportunities`) go through the
tracked job flow so cost/telemetry are captured.

---

## 13. Background Jobs

No queue library is introduced (constraint + fits current architecture). Jobs are `tsx` scripts under
`src/scripts/`, exactly like `scrape.ts`/`audit.ts`/`pipeline.ts`, added to `package.json`:

```jsonc
"intel:collect":      "tsx src/scripts/intel-collect.ts",
"intel:synthesize":   "tsx src/scripts/intel-synthesize.ts",
"intel:opportunities":"tsx src/scripts/intel-opportunities.ts --min-score 60 --limit 25"
```

Each script: acquires a Postgres **advisory lock** for its kind (so overlapping cron ticks can't
double-run), opens an `intel_jobs` row, does its work, records stats + cost, releases. Idempotency:
collectors dedup on `raw_signals(source_id, content_hash)`; synthesis processes only signals since the
last successful run watermark stored on the job. This is the same "guard with a status row" idea the
coverage service already uses for `en_progreso`.

---

## 14. Scheduling

Cron drives the scripts. Cadence tiers:

| Job | Cadence | Rationale |
|---|---|---|
| `intel:collect` (fast sources: Trends, Reddit, HN, News) | every 1–3h | catch daily/real-time spikes |
| `intel:collect` (slow sources: RSS, GitHub, Product Hunt) | every 6–12h | lower churn, save quota |
| `intel:synthesize` | every 3–6h | cluster/validate/score the fresh corpus |
| `intel:opportunities` (batch for hot leads) | daily | refresh per-lead ideas cheaply |
| retention prune | weekly | TTL raw_signals/observations/events |

Cadence per source is data (`content_sources.cadence_minutes`), so tuning is a DB edit, not a deploy.
Any cron works (system crontab, the host's scheduler, or Claude Code's own schedule/loop for a
single-box setup). The scheduler is deliberately outside the app process, matching how the tool runs today.

---

## 15. Event System

`intel_events` is an **append-only Postgres event ledger** (event type, payload jsonb, occurred_at,
optional `consumed_at`), not a broker. Emitted at stage boundaries: `signals.collected`,
`trend.created`, `trend.updated`, `opportunity.generated`, `opportunity.status_changed`. Uses:

- **Audit/replay:** reconstruct why a trend or opportunity exists.
- **Decoupling seam:** a future worker could poll unconsumed events instead of the driver calling the
  next stage directly — without changing producers.
- **UI freshness:** the dashboard's existing poll pattern can read "latest events" for a live feel.

For current volume, stages still call each other directly; the ledger is truth + optionality. This is
the honest, framework-free interpretation of "event system" for a single-Postgres app.

---

## 16. Trend Collection Pipeline

`collect.ts` per enabled source:

1. `registry.ts` yields enabled `Source` implementations (skips any whose required env key is absent).
2. Each `Source.fetch(ctx)` uses `fetchText` (timeouts, retries, SSRF guards already implemented) and
   returns `RawSignalInput[]` — **no LLM**, deterministic parsing.
3. `normalize.ts`: strip HTML (`stripHtml` exists), detect lang/region, extract keywords, compute
   `contentHash`, coerce metrics into a numeric map.
4. Upsert into `raw_signals` with `onConflictDoNothing` on `(source_id, content_hash)` → automatic dedup.
5. Log a per-source `api_usage` row (`provider` e.g. `"google_trends"`, `requestCount`) so external
   call volume is visible next to AI/Places spend.
6. Update `content_sources.last_run_at/last_ok_at/last_error` for the health view.

The `Source` interface (uniform, pluggable):

```ts
export interface Source {
  platform: string; kind: SourceKind; requiresKey: boolean;
  fetch(ctx: CollectContext): Promise<RawSignalInput[]>;
}
```

Free sources ship enabled-capable; paid/authenticated ones (`_paid/*`) implement the same interface but
`requiresKey=true` and stay disabled until configured — satisfying "capable of consuming TikTok/Meta/etc."
without ever requiring them to boot.

---

## 17. Trend Validation Pipeline

`synthesize.ts`:

1. Pull `raw_signals` since the last watermark, grouped into manageable batches.
2. `trendSynthesisAgent` clusters each batch into candidate trends **with `signalIds`**.
3. Merge candidates against existing `trends` by `slug`/semantic-title (cheap normalized match; upsert
   or attach evidence to an existing trend rather than duplicating).
4. `trendValidationAgent` gets each candidate + its evidence and returns keep / merge / reject with a
   reason (e.g. "single-source, low corroboration → reject or mark low-confidence").
5. `trend_classify` tags category/lifecycle/audiences.
6. Persist `trends`, `trend_evidence` (the FK links that *make it real*), a `trend_observations` row
   (current aggregate strength), and a fresh `trend_scores` snapshot.
7. Lifecycle transitions (`emerging→rising→peaking→declining→dormant`) are computed from the
   observation series in code, never asserted by the LLM.

Anything the pipeline cannot corroborate is stored with **low confidence**, not discarded silently, and
surfaced as such — the UI can hide `confidence < threshold`.

---

## 18. Recommendation Engine

Per business, recommendation = **retrieve → match → generate → score → rank → guard**:

1. **Retrieve** the current candidate trend set (recent + evergreen + category-aligned), pre-filtered in
   SQL by the business's `category`, `country`, `lang` to keep the LLM input small and relevant.
2. **Match** (`business_match` agent): rank trends for *this* business with a `why` per trend, using the
   business context we already have (Places fields + existing `research_profiles`/`audits`).
3. **Generate** (`content_strategy` + `creative_director`): turn top matches into full opportunities.
4. **Score** (code) + **Rank** (code) + **Guard** (code) — §19–§20, §31.

Reusing the *existing* enrichment (research summary, audit issues, competitor gaps) means Pipeline B
starts from real, business-specific context instead of re-deriving it — cheaper and more grounded.

---

## 19. Scoring Algorithms

**All scores are deterministic functions of collected data or trend scores — never free-form LLM numbers.**

- `momentum = round(100 * ema(volume_growth_rate))` from `trend_observations` deltas.
- `volume = normalize(sum of per-signal metric magnitudes)` across sources (min-max over the corpus window).
- `crossPlatform = min(100, 20 * distinct_platforms_in_evidence)`.
- `confidence = clamp(w1*log1p(sources) + w2*corroboration + w3*recency + w4*source_trust)` — where
  `source_trust` is a per-`content_sources` prior (a curated newswire ≠ a random forum thread).
- `evergreen = f(persistence: observed span / spike-ratio)` — long steady span → high; single spike → low.
- `competition` (per opportunity) = saturation proxy from how many recent signals already execute the
  format (higher = more crowded).
- `businessFit = keyword/category overlap(business, trend) blended with the matcher's ranking`, both bounded.
- `viralityScore` **inherits** `trend.momentum × format_multiplier` — it is *derived*, not invented.

Weights live in `scoring/*.ts` constants, are unit-testable, and are versioned via `trend_scores.method`
so the model can evolve without rewriting history.

## 20. Ranking Algorithms

The queue rank is a transparent weighted blend, tunable in code:

```
rank = 0.30*businessFit + 0.25*momentum + 0.15*confidence
     + 0.15*evergreen  + 0.10*seoOpportunity - 0.15*competition
```

Ranking is pure and explainable (we can show the contribution of each term in the UI), respects
`confidence` (low-confidence trends sink), and never surfaces an opportunity that fails the guard.

---

## 21. Business Matching Engine

Inputs already in the DB per business: category, country, zone, rating/reviews, `research_profiles`
(summary, strengths, opportunities, outreach angle), latest `audits` (issues, tech signals), competitor
gaps. The engine:

1. SQL pre-filter trends by category/region/lang/lifecycle to a small candidate set.
2. `business_match` agent ranks candidates with a one-line `why` grounded in the business context.
3. Deterministic `businessFit` blends the agent rank with keyword/category overlap and de-duplicates
   near-identical trends. Output: an ordered `{trendId, fit, why}[]` feeding Pipeline B.

Because the matcher consumes existing enrichment, a business that's been through the marketing pipeline
gets sharper matches — the two subsystems compound.

---

## 22. Content Opportunity Engine

For each top match, `content_strategy` picks the format (short/long/series/campaign) and angle, then
`creative_director` produces the concrete blueprint. Every generated opportunity carries **full
provenance**: `trendId`, `opportunity_evidence` rows pointing at the `raw_signals`/trend it stands on,
and a `reasoning` string that explains the fit *for this business*. Opportunities are persisted as
`borrador` and only appear in the queue after passing Evidence-Guard + QA.

Each opportunity includes every field requested: title, hook, first-3s, script beats, CTA, thumbnail
concept, opening shot, editing suggestions, platform, duration, difficulty, production cost, business
relevance, virality/fit/competition/trend-confidence/trend-momentum/evergreen/SEO scores, keywords,
hashtags, posting time, frequency, repurposing strategy, expected audience, reasoning, sources,
evidence, timestamp, confidence.

## 23. Video Generation Strategy

The system designs videos; it does not render them (staying honest about capability). Output is a
**production-ready blueprint** a human or a downstream tool can shoot: hook + first-3s + beat-by-beat
`script` (onscreen text + voiceover per beat) + thumbnail concept + opening shot + editing directions +
platform-specific duration/format. Repurposing maps one shoot into multiple cuts (e.g. one long-form →
3 shorts → 1 carousel), so effort compounds. If/when a video-render integration exists, it slots in as
a new deterministic step consuming `content_opportunities.script` — no architectural change.

---

## 24. Calendar Engine

`calendar.ts` turns approved opportunities into a schedule: given a business's cadence and platform mix,
it slots opportunities across a week/month, respecting per-platform best posting times (a data table,
not an LLM guess) and avoiding same-day cannibalization. A scheduled slot writes a **draft** into the
existing `social_posts` table (which already models `scheduledFor`, `status`, `platform`,
`businessId`) — so publishing reuses the Phase-2 social layer instead of inventing a parallel one.
`content_plans` holds the planning view; `social_posts` remains the publish substrate.

---

## 25. Cost Tracking

Reuse `logApiUsage` → `api_usage` unchanged. CLI AI calls log tokens with `costUsd=0` (subscription),
already surfaced by the sidebar "API spend" panel. Collectors log their external calls
(`provider="google_trends" | "reddit" | …`, `requestCount`) so non-AI volume is visible too. Each
`intel_jobs` row rolls up `total_cost_usd` like `pipeline_runs`. Net: one consistent cost ledger across
Places, PageSpeed, AI, and the new collectors — no separate accounting.

## 26. Usage Tracking

Beyond dollars, we track the two things that actually constrain this system: **subscription rate limits**
and **collector quotas**. A per-run token/turn budget guards Pipeline A/B (abort a run before it burns
the daily CLI allowance); `content_sources` carries `cadence_minutes` and last-run timestamps to
self-throttle. `usageSummary()` gains intel providers automatically since it groups by `provider`.

---

## 27. Logging

Same conventions as today: structured `console.*` in server code, DB rows as the durable record.
`intel_job_tasks` is the per-step log (status, tokens, error message, timings) exactly like
`agent_tasks`; `raw_signals.fetched_at` + `intel_events` give an append-only trace of what was ingested
and when. No new logging framework — the database *is* the log for anything worth keeping.

## 28. Telemetry

Operational health is queryable from the tables: collector success rate (`content_sources.last_ok_at`
vs `last_run_at`), synthesis throughput (signals→trends per run from `intel_jobs.stats`), agent latency
(`intel_job_tasks` start/finish deltas), evidence coverage (% opportunities with ≥1 evidence row —
should be 100% by construction), and rejection rate from Evidence-Guard. The Sources and Operations
pages render these; nothing ships to a third party.

---

## 29. Performance Optimizations

- **SQL pre-filtering before the LLM:** never hand the model the whole corpus — filter by
  category/region/lang/recency first, so prompts stay small and cheap.
- **Batch synthesis** with watermarks; process only new signals.
- **Indexes** on the hot paths (`raw_signals.fetched_at`, `.platform`; `trends.status`;
  `content_opportunities.business_id/status`).
- **Conditional HTTP** in collectors (ETag/Last-Modified) to skip unchanged feeds.
- **`Promise.all`** for independent collectors within a run (bounded concurrency), while AI calls stay
  sequential with the 800ms anti-burst gap the CLI subprocess model needs.
- **Append-only tables partition-ready** for when row counts grow.

## 30. Caching Strategy

Three layers:
1. **Ingestion dedup:** `raw_signals(source_id, content_hash)` unique index — identical items are never
   re-stored or re-processed.
2. **LLM cache:** `llm_cache(agent, input_hash) → output` with a TTL. Because the CLI provider is
   rate-limited, skipping an identical agent call is the single biggest cost/latency win. Keyed by a
   hash of `(agent.kind, system, user)`.
3. **Read cache:** trend-radar reads are cheap and can be memoized per request window; scores carry
   `computed_at` so the UI can show freshness and avoid recompute.

---

## 31. Error Handling

- **Provider failures** already retried once in `runViaCli`; agents that still fail record an `error`
  task and the pipeline degrades gracefully (Pipeline B can emit fewer opportunities; Pipeline A skips a
  bad batch). Same resilience contract as `orchestrator.ts`.
- **Collector failures** are isolated per source: one bad feed sets `content_sources.last_error` and
  never aborts the whole collection run.
- **Evidence-Guard (the anti-hallucination gate):** a *deterministic* validator that rejects any
  opportunity/trend whose cited `signalIds`/URLs are not present in the input evidence, whose scores are
  out of range, or that references a URL absent from `raw_signals`. Rejected items are logged (for
  prompt tuning) and never shown. This is what enforces "never fabricate", independent of model behavior.
- **Zod validation** on every agent output (inherited from `runStructured`) catches malformed JSON.

## 32. Security

- Behind the existing auth gate; server-only env access via `@/server/config/env`; no source keys in the
  client. `/intel/collect` and source-admin routes require the session.
- **SSRF/abuse:** collectors go through `fetchText` (timeouts, retries, size caps); outbound targets are
  from a vetted source registry, not user input. Respect robots/ToS and rate limits; paid/authenticated
  scrapers stay off by default.
- **Content safety:** collected HTML is `stripHtml`-sanitized before ever reaching a prompt; stored raw
  payloads are treated as untrusted data, never executed.
- **PII:** social/forum authors are minimized; we store what's needed for evidence and nothing sensitive.

---

## 33. Future Extensions

Clean seams already designed in: (a) enable `_paid/*` collectors by adding a key — no code change to the
pipeline; (b) swap cron+scripts for a real queue behind the same `Job`/`Source` interfaces if volume
explodes; (c) add a video-render step consuming `content_opportunities.script`; (d) add semantic trend
dedup via a local embedding step (still no external API — a small local model or `pgvector`) behind the
existing merge function; (e) A/B feedback loop: capture published-post performance back into
`trend_observations` to close the learning loop and improve `businessFit` priors.

## 34. Technical Debt Prevention

- **One AI path:** all intel agents go through `BaseAgent`/`runStructured` — no shadow client, no second
  provider, so the "no Anthropic API / no new framework" rule can't rot.
- **Numbers vs. words split:** keeping all metrics in code (scoring) and all provenance in FKs prevents
  the classic drift where an LLM slowly starts "owning" the truth.
- **Text-enums + additive migrations:** new statuses/kinds never require destructive `ALTER TYPE`.
- **Evidence-Guard as a hard gate** keeps quality from degrading as prompts change.
- **Interfaces (`Source`, `Job`, `BaseAgent`)** localize change; adding a source or agent is a new file,
  not a refactor.

## 35. Why each major decision was chosen

| Decision | Why |
|---|---|
| Collectors (code) separate from Agents (LLM) | Only way to *guarantee* no fabricated trends/metrics; also fits the tool-less CLI provider |
| Evidence ledger (`raw_signals`) + FK evidence links | Makes "every claim has a source" a schema invariant, not a hope |
| Scores computed in code, derived from real metrics | Prevents hallucinated virality/volume; makes scoring testable & versioned |
| Reuse `BaseAgent`/`runStructured`/CLI provider | Honors the hard constraint; zero new AI infra; inherits retries/logging/subscription auth |
| `intel_jobs`/`intel_job_tasks` mirroring `pipeline_runs`/`agent_tasks` | Same telemetry & Operations UI for free; avoids migrating a hot production table |
| `tsx` scripts + cron + advisory locks (no queue) | Matches how the app already runs; no Redis/BullMQ/broker to violate constraints |
| Postgres event ledger instead of a message bus | Gives decoupling/replay without a framework; scale seam preserved |
| Reuse `social_posts` for publishing | Don't duplicate the Phase-2 social layer; calendar just fills it |
| Append-only, partition-ready tables | Scales later with a single migration; no premature partitioning now |
| Paid sources pluggable but disabled | "Capable of consuming TikTok/Meta/Semrush" without requiring paid keys to run |

---

## Appendix — Self-critique loop (how this converged)

**Iteration 1 (rejected).** First design let agents "browse" sources and emit trends + virality
numbers directly. Fatal flaws: (1) the CLI provider has no tools/browsing, so it *couldn't* fetch —
and if it "answered anyway" it would hallucinate, violating the #1 rule; (2) numbers with no
provenance; (3) reused `pipeline_runs` whose `businessId` is NOT NULL for a global pipeline; (4) an
imagined Redis/BullMQ queue and a Kafka-style bus — both banned and unfit for the current app; (5)
unbounded `raw_signals` with no dedup; (6) no anti-hallucination enforcement beyond a prompt.

**Iteration 2.** Split Collectors (code) from Agents (LLM); made `raw_signals` the evidence ledger with
`content_hash` dedup; forced `signalIds` in agent schemas; moved all metrics to deterministic scoring;
replaced the queue/bus with `tsx`+cron+advisory-locks and a Postgres event ledger; added
`intel_jobs`/`intel_job_tasks` with nullable `businessId`. Remaining gaps: a clever prompt could still
cite a fake id; scoring could drift; subscription rate limits unaddressed; calendar risked duplicating
`social_posts`.

**Iteration 3 (this document).** Added the **deterministic Evidence-Guard** (rejects any output citing
ids/URLs not in the input — the real guarantee, independent of the model); versioned `trend_scores`
(`method`) so scoring evolves without rewriting history; an `llm_cache` + per-run token budget for the
rate-limited subscription; reused `social_posts` as the publish substrate; and SQL pre-filtering to keep
prompts small. Further changes now trade correctness or the stated constraints for marginal gains, so
the loop is stopped here.

**Reality-check note (principal judgment):** the prompt asks whether this survives 100k businesses and
millions of records. On a single Postgres and a personal Pro subscription, the *binding* constraints are
subscription rate limits and honest provenance, not raw throughput. This design optimizes for those and
keeps the append-only tables partition-ready — so it scales by a migration, not a rewrite — rather than
importing infrastructure that would violate the "fits the current architecture / no new frameworks"
mandate. Building HubSpot's cluster here would be the *wrong* kind of impressive.
```
