/**
 * Drizzle schema — Juko Prospect (internal B2B prospecting tool).
 *
 * Phase 1: zones, coverage, businesses, audits, notes.
 * Phase 2: pipeline_runs, agent_tasks, research_profiles, competitor_analyses,
 *          outreach_messages, social_accounts, social_posts, api_usage.
 *
 * Target: PostgreSQL (via Docker). The schema is portable to other Postgres hosts
 * without changes. All money is stored as numeric(12,6) USD; tokens as integers.
 */
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  real,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ───────────────────────── enums (kept as text + check-free for flexibility) ─────────────────────────
 * We use plain text columns with documented allowed values instead of pg enums,
 * so adding a new status in Phase 2 never requires an ALTER TYPE migration. */

export const COVERAGE_STATUS = [
  "pendiente",
  "en_progreso",
  "completada",
  "completada_parcial",
  "error",
] as const;
export type CoverageStatus = (typeof COVERAGE_STATUS)[number];

export const LEAD_STATUS = [
  "nuevo",
  "contactado",
  "en_conversacion",
  "propuesta_enviada",
  "cerrado",
  "descartado",
] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const AUDIT_STATUS = ["none", "ok", "partial", "error"] as const;
export type AuditStatus = (typeof AUDIT_STATUS)[number];

export const AGENT_KIND = [
  "research",
  "audit_seo",
  "copywriting",
  "orchestrator",
  // Content Intelligence Center agents
  "trend_synthesis",
  "trend_validation",
  "trend_classify",
  "business_match",
  "content_strategy",
  "creative_director",
  "opportunity_qa",
  "intel_orchestrator",
  "claude_angle",
] as const;
export type AgentKind = (typeof AGENT_KIND)[number];

/* ── Content Intelligence Center enums (text columns → additive) ── */
export const TREND_STATUS = ["emerging", "rising", "peaking", "declining", "evergreen", "dormant"] as const;
export type TrendStatus = (typeof TREND_STATUS)[number];

export const SOURCE_KIND = ["trends", "social", "search", "news", "forum", "catalog", "rss"] as const;
export type SourceKind = (typeof SOURCE_KIND)[number];

export const OPPORTUNITY_STATUS = ["borrador", "aprobada", "programada", "publicada", "descartada"] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[number];

export const TASK_STATUS = ["pendiente", "en_progreso", "completada", "error"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

/* ───────────────────────── Phase 1: cities ─────────────────────────
 * Geographic tier between country and zone. Big countries (Colombia) have many
 * cities, each with many zones/barrios; small city-states (Malta) have a city per
 * locality with a single same-named zone (the UI collapses that redundant level). */

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    country: text("country").notNull(), // e.g. "Colombia", "Malta"
    name: text("name").notNull(), // e.g. "Bogotá", "Sliema"
    planned: boolean("planned").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("cities_country_name_uniq").on(t.country, t.name),
    index("cities_country_idx").on(t.country),
  ],
);

/* ───────────────────────── Phase 1: zones ─────────────────────────
 * Work unit for scraping (zone × category). Always belongs to a city. */

export const zones = pgTable(
  "zones",
  {
    id: serial("id").primaryKey(),
    country: text("country").notNull(), // denormalized from city for fast filters
    cityId: integer("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // work unit, e.g. "Chapinero", "St. Julian's"
    displayName: text("display_name"), // e.g. "Chapinero, Bogotá, Colombia"
    lat: real("lat"),
    lng: real("lng"),
    // True when this zone is part of a country's planned coverage target,
    // so "5 de 8 zonas" has a denominator even before any scrape runs.
    planned: boolean("planned").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("zones_city_name_uniq").on(t.cityId, t.name),
    index("zones_city_idx").on(t.cityId),
  ],
);

/* ───────────────────────── Phase 1: coverage (zonas_evaluadas) ─────────────────────────
 * One row per (zone × category) execution unit. This is the section-0 ledger. */

export const coverage = pgTable(
  "coverage",
  {
    id: serial("id").primaryKey(),
    zoneId: integer("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // e.g. "restaurants"
    status: text("status").notNull().default("pendiente"), // CoverageStatus
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    resultsCount: integer("results_count").notNull().default(0),
    refreshIntervalDays: integer("refresh_interval_days").notNull().default(90),
    nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true }),
    apiCallsUsed: integer("api_calls_used").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coverage_zone_category_uniq").on(t.zoneId, t.category),
    index("coverage_status_idx").on(t.status),
  ],
);

/* ───────────────────────── Phase 1: businesses (negocios) ─────────────────────────
 * Global dedup by place_id. Denormalized audit + lead fields for fast dashboard reads. */

export const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    placeId: text("place_id").notNull(), // Google Places global id — unique
    name: text("name").notNull(),
    category: text("category"), // the category used to find it
    address: text("address"),
    lat: real("lat"),
    lng: real("lng"),
    phone: text("phone"),
    internationalPhone: text("international_phone"),
    website: text("website"),
    rating: real("rating"),
    reviewsCount: integer("reviews_count"),
    businessStatus: text("business_status"), // OPERATIONAL, CLOSED_TEMPORARILY...
    googleTypes: jsonb("google_types").$type<string[]>(),
    country: text("country"),
    zoneId: integer("zone_id").references(() => zones.id, { onDelete: "set null" }),
    raw: jsonb("raw"), // last raw Places payload snapshot
    // ── denormalized audit summary (latest) ──
    opportunityScore: integer("opportunity_score"),
    auditStatus: text("audit_status").notNull().default("none"), // AuditStatus
    lastAuditedAt: timestamp("last_audited_at", { withTimezone: true }),
    // ── pipeline / lead state ──
    leadStatus: text("lead_status").notNull().default("nuevo"), // LeadStatus
    leadStatusUpdatedAt: timestamp("lead_status_updated_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("businesses_place_id_uniq").on(t.placeId),
    index("businesses_zone_idx").on(t.zoneId),
    index("businesses_category_idx").on(t.category),
    index("businesses_score_idx").on(t.opportunityScore),
    index("businesses_lead_status_idx").on(t.leadStatus),
  ],
);

/* ───────────────────────── Phase 1: audits (auditorías) ─────────────────────────
 * History (1:N). Latest summary is denormalized onto businesses. */

export const audits = pgTable(
  "audits",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    auditedAt: timestamp("audited_at", { withTimezone: true }).notNull().defaultNow(),
    // PageSpeed Insights — scores are 0-100 (null when unavailable)
    psiMobilePerformance: integer("psi_mobile_performance"),
    psiMobileSeo: integer("psi_mobile_seo"),
    psiMobileAccessibility: integer("psi_mobile_accessibility"),
    psiMobileBestPractices: integer("psi_mobile_best_practices"),
    psiDesktopPerformance: integer("psi_desktop_performance"),
    psiDesktopSeo: integer("psi_desktop_seo"),
    psiDesktopAccessibility: integer("psi_desktop_accessibility"),
    psiDesktopBestPractices: integer("psi_desktop_best_practices"),
    hasHttps: boolean("has_https"),
    hasChatWidget: boolean("has_chat_widget"),
    chatVendor: text("chat_vendor"), // whatsapp, intercom, tawk, crisp...
    isEcommerce: boolean("is_ecommerce"),
    ecommercePlatform: text("ecommerce_platform"), // shopify, woocommerce...
    techSignals: jsonb("tech_signals").$type<string[]>(),
    // Contact info scraped from the website (for outreach).
    emails: jsonb("emails").$type<string[]>(),
    phones: jsonb("phones").$type<string[]>(),
    issues: jsonb("issues").$type<string[]>(), // detected problem codes
    opportunityScore: integer("opportunity_score"),
    httpStatus: integer("http_status"),
    psiError: text("psi_error"),
    fetchError: text("fetch_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audits_business_idx").on(t.businessId)],
);

/* ───────────────────────── Phase 1: notes ───────────────────────── */

export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_business_idx").on(t.businessId)],
);

/* ───────────────────────── Phase 2: pipeline_runs ───────────────────────── */

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pendiente"), // TaskStatus
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 6 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pipeline_runs_business_idx").on(t.businessId)],
);

/* ───────────────────────── Phase 2: agent_tasks (tareas) ───────────────────────── */

export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    runId: integer("run_id").references(() => pipelineRuns.id, { onDelete: "cascade" }),
    agent: text("agent").notNull(), // AgentKind
    status: text("status").notNull().default("pendiente"), // TaskStatus
    result: jsonb("result"),
    errorMessage: text("error_message"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agent_tasks_business_idx").on(t.businessId),
    index("agent_tasks_run_idx").on(t.runId),
    index("agent_tasks_status_idx").on(t.status),
  ],
);

/* ───────────────────────── Phase 2: research_profiles ───────────────────────── */

export const researchProfiles = pgTable(
  "research_profiles",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    summary: text("summary"),
    socialLinks: jsonb("social_links").$type<Record<string, string>>(),
    strengths: jsonb("strengths").$type<string[]>(),
    opportunities: jsonb("opportunities").$type<string[]>(),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("research_profiles_business_idx").on(t.businessId)],
);

/* ───────────────────────── Phase 2: competitor_analyses ───────────────────────── */

export const competitorAnalyses = pgTable(
  "competitor_analyses",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    competitors: jsonb("competitors"), // [{ name, scores, url }]
    contentGaps: jsonb("content_gaps").$type<string[]>(),
    seoGaps: jsonb("seo_gaps").$type<string[]>(),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("competitor_analyses_business_idx").on(t.businessId)],
);

/* ───────────────────────── Phase 2: outreach_messages ───────────────────────── */

export const outreachMessages = pgTable(
  "outreach_messages",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // email | whatsapp
    subject: text("subject"),
    body: text("body").notNull(),
    contentIdeas: jsonb("content_ideas").$type<string[]>(), // sample post ideas
    model: text("model"),
    status: text("status").notNull().default("borrador"), // borrador|aprobado|enviado
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outreach_messages_business_idx").on(t.businessId)],
);

/* ───────────────────────── Phase 2: social_accounts ─────────────────────────
 * Prepared for future OAuth — no auth flow implemented yet. */

export const SOCIAL_PLATFORMS = ["linkedin", "instagram", "youtube", "tiktok", "x"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // SocialPlatform
  accountName: text("account_name").notNull(),
  externalId: text("external_id"),
  // Legacy placeholder column (unused). Real tokens live in the *_enc columns.
  accessTokenRef: text("access_token_ref"),
  // Social Studio (Fase 4): tokens cifrados AES-256-GCM con SOCIAL_TOKEN_KEY.
  handle: text("handle"),
  avatarUrl: text("avatar_url"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: text("scopes"),
  meta: jsonb("meta").$type<Record<string, unknown>>(), // p.ej. { igUserId, pageId }
  status: text("status").notNull().default("disconnected"), // disconnected|connected|error
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────────────────── Phase 2: social_posts ───────────────────────── */

export const socialPosts = pgTable(
  "social_posts",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    outreachMessageId: integer("outreach_message_id").references(
      () => outreachMessages.id,
      { onDelete: "set null" },
    ),
    socialAccountId: integer("social_account_id").references(() => socialAccounts.id, {
      onDelete: "set null",
    }),
    platform: text("platform").notNull(),
    content: text("content").notNull(),
    media: jsonb("media").$type<string[]>(),
    status: text("status").notNull().default("borrador"), // borrador|programado|publicado|fallido
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    externalPostId: text("external_post_id"),
    // Social Studio (Fase 4): autoría, errores y reintentos del dispatcher.
    createdBy: text("created_by"),
    errorMessage: text("error_message"),
    retries: integer("retries").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("social_posts_status_idx").on(t.status), index("social_posts_sched_idx").on(t.scheduledFor)],
);

/* ───────────────────────── Phase 2: api_usage (cost/usage control) ───────────────────────── */

export const apiUsage = pgTable(
  "api_usage",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(), // anthropic | google_places | pagespeed
    model: text("model"),
    operation: text("operation").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    businessId: integer("business_id").references(() => businesses.id, {
      onDelete: "set null",
    }),
    taskId: integer("task_id").references(() => agentTasks.id, { onDelete: "set null" }),
    requestCount: integer("request_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("api_usage_provider_idx").on(t.provider),
    index("api_usage_created_idx").on(t.createdAt),
  ],
);

/* ═══════════════════════ Content Intelligence Center ═══════════════════════
 * Evidence-first trend intelligence. Collectors (plain code) write raw_signals
 * (the citable evidence ledger); agents (claude -p) reason ONLY over those rows
 * and must cite signal ids; all popularity numbers live in raw_signals.metrics /
 * scoring, never invented by the model. See docs/content-intelligence-center.md. */

export const contentSources = pgTable(
  "content_sources",
  {
    id: serial("id").primaryKey(),
    platform: text("platform").notNull(), // "hacker_news","google_trends","reddit"...
    kind: text("kind").notNull(), // SourceKind
    label: text("label").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    requiresKey: boolean("requires_key").notNull().default(false),
    config: jsonb("config").$type<Record<string, unknown>>(),
    cadenceMinutes: integer("cadence_minutes").notNull().default(360),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastOkAt: timestamp("last_ok_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("content_sources_platform_label_uniq").on(t.platform, t.label)],
);

export const rawSignals = pgTable(
  "raw_signals",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => contentSources.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    externalId: text("external_id"),
    url: text("url"), // real, citable link (evidence)
    title: text("title"),
    body: text("body"),
    author: text("author"),
    lang: text("lang"),
    region: text("region"),
    // ALL popularity numbers live here (points, comments, views, growth%…).
    metrics: jsonb("metrics").$type<Record<string, number>>(),
    keywords: jsonb("keywords").$type<string[]>(),
    contentHash: text("content_hash").notNull(), // dedup key
    observedAt: timestamp("observed_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    raw: jsonb("raw"),
  },
  (t) => [
    uniqueIndex("raw_signals_source_hash_uniq").on(t.sourceId, t.contentHash),
    index("raw_signals_platform_idx").on(t.platform),
    index("raw_signals_fetched_idx").on(t.fetchedAt),
  ],
);

export const trends = pgTable(
  "trends",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    category: text("category"),
    platforms: jsonb("platforms").$type<string[]>(),
    lang: text("lang"),
    region: text("region"),
    status: text("status").notNull().default("emerging"), // TrendStatus
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trends_slug_uniq").on(t.slug), index("trends_status_idx").on(t.status)],
);

export const trendEvidence = pgTable(
  "trend_evidence",
  {
    id: serial("id").primaryKey(),
    trendId: integer("trend_id")
      .notNull()
      .references(() => trends.id, { onDelete: "cascade" }),
    rawSignalId: integer("raw_signal_id")
      .notNull()
      .references(() => rawSignals.id, { onDelete: "cascade" }),
    weight: real("weight").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trend_evidence_uniq").on(t.trendId, t.rawSignalId)],
);

export const trendScores = pgTable(
  "trend_scores",
  {
    id: serial("id").primaryKey(),
    trendId: integer("trend_id")
      .notNull()
      .references(() => trends.id, { onDelete: "cascade" }),
    method: text("method").notNull().default("v1"),
    momentum: integer("momentum"),
    volume: integer("volume"),
    crossPlatform: integer("cross_platform"),
    competition: integer("competition"),
    evergreen: integer("evergreen"),
    confidence: integer("confidence"),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trend_scores_trend_idx").on(t.trendId)],
);

export const trendObservations = pgTable(
  "trend_observations",
  {
    id: serial("id").primaryKey(),
    trendId: integer("trend_id")
      .notNull()
      .references(() => trends.id, { onDelete: "cascade" }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    volume: integer("volume").notNull().default(0),
    engagement: integer("engagement").notNull().default(0),
    sourcesCount: integer("sources_count").notNull().default(0),
  },
  (t) => [index("trend_observations_trend_idx").on(t.trendId)],
);

export const intelJobs = pgTable(
  "intel_jobs",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // "collect" | "synthesize" | "opportunities"
    businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pendiente"), // TaskStatus
    stats: jsonb("stats").$type<Record<string, number>>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    totalCostUsd: numeric("total_cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("intel_jobs_kind_idx").on(t.kind), index("intel_jobs_status_idx").on(t.status)],
);

export const intelJobTasks = pgTable(
  "intel_job_tasks",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => intelJobs.id, { onDelete: "cascade" }),
    businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    agent: text("agent").notNull(), // AgentKind
    status: text("status").notNull().default("pendiente"), // TaskStatus
    result: jsonb("result"),
    errorMessage: text("error_message"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("intel_job_tasks_job_idx").on(t.jobId)],
);

/* Content opportunities (Pipeline B) — per-business, trend-derived video/content ideas. */
export const contentOpportunities = pgTable(
  "content_opportunities",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    trendId: integer("trend_id").references(() => trends.id, { onDelete: "set null" }),
    jobId: integer("job_id").references(() => intelJobs.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    hook: text("hook"),
    first3s: text("first_3s"),
    script: jsonb("script").$type<{ beat: string }[]>(),
    cta: text("cta"),
    thumbnailConcept: text("thumbnail_concept"),
    platform: text("platform"),
    durationSeconds: integer("duration_seconds"),
    difficulty: text("difficulty"), // baja | media | alta
    productionCost: text("production_cost"), // baja | media | alta
    editing: jsonb("editing").$type<string[]>(),
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
    reasoning: text("reasoning"),
    status: text("status").notNull().default("borrador"), // OpportunityStatus
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("content_opportunities_business_idx").on(t.businessId),
    index("content_opportunities_status_idx").on(t.status),
  ],
);

export const opportunityEvidence = pgTable(
  "opportunity_evidence",
  {
    id: serial("id").primaryKey(),
    opportunityId: integer("opportunity_id")
      .notNull()
      .references(() => contentOpportunities.id, { onDelete: "cascade" }),
    rawSignalId: integer("raw_signal_id").references(() => rawSignals.id, { onDelete: "set null" }),
    trendId: integer("trend_id").references(() => trends.id, { onDelete: "set null" }),
    note: text("note"),
  },
  (t) => [index("opportunity_evidence_opp_idx").on(t.opportunityId)],
);

/* "Trend × Claude" ideas — video + project ideas that implement Claude on top of a
 * trending tool/topic, for Juko's own brand content (attract clients). */
export const claudeIdeas = pgTable(
  "claude_ideas",
  {
    id: serial("id").primaryKey(),
    trendId: integer("trend_id").references(() => trends.id, { onDelete: "cascade" }),
    jobId: integer("job_id").references(() => intelJobs.id, { onDelete: "set null" }),
    kind: text("kind").notNull().default("video"), // video | proyecto
    title: text("title").notNull(),
    hook: text("hook"),
    claudeImpl: text("claude_impl"), // MCP | Claude Code | Agent SDK | API | automatización
    combo: text("combo"), // the trending tool/topic paired with Claude
    platform: text("platform"),
    steps: jsonb("steps").$type<string[]>(),
    impact: text("impact"),
    difficulty: text("difficulty"),
    status: text("status").notNull().default("nueva"), // nueva | guardada | descartada
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("claude_ideas_trend_idx").on(t.trendId), index("claude_ideas_status_idx").on(t.status)],
);

/* ───────────────────────── notifications (Fase 3 del refactor) ─────────────
 * Bandeja por usuario (usernames de AUTH_USERS). `entityType`/`entityId`
 * permiten el deep-link (ej. task 12) y `meta` lleva contexto extra como el
 * comentario a resaltar. DDL aplicado por `npm run app:migrate` (idempotente). */

export const NOTIFICATION_TYPE = [
  "task_assigned",
  "task_comment",
  "task_moved",
  "goal_update",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userTo: text("user_to").notNull(), // username destino
    actor: text("actor"), // username que originó el evento (avatar)
    type: text("type").notNull(), // NotificationType
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"), // "task" | "goal" | …
    entityId: integer("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(), // p.ej. { commentId }
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_read_idx").on(t.userTo, t.read),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

/* ───────────────────────── Radar IA (Fase 5 del refactor) ─────────────────
 * Top trends sobre Claude/Anthropic, OpenAI e IA para creación de contenido.
 * Refresh SIEMPRE manual (control de costos/limites de la suscripción): cada
 * refresh crea un radar_run con sus items; la UI muestra el último run (caché). */

export const RADAR_TOPICS = ["claude", "openai", "content_ai"] as const;
export type RadarTopic = (typeof RADAR_TOPICS)[number];
export const RADAR_SOURCES = ["x", "reddit", "news"] as const;
export type RadarSource = (typeof RADAR_SOURCES)[number];

export const radarRuns = pgTable("radar_runs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("ok"), // ok | error
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  stats: jsonb("stats").$type<Record<string, number>>(),
});

export const radarItems = pgTable(
  "radar_items",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => radarRuns.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(), // RadarTopic
    source: text("source").notNull(), // RadarSource
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url"),
    sentiment: text("sentiment"), // positivo | neutral | negativo
    relevance: integer("relevance"), // 0–100
    publishedHint: text("published_hint"), // "hace 3 h", "12 jul", … (texto del agente)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("radar_items_run_idx").on(t.runId)],
);

/* ───────────────────────── Tareas — Kanban (Fase 6 del refactor) ──────────
 * Control de tareas de los 2 usuarios. Columnas configurables como texto;
 * `sortOrder` es el índice dentro de la columna (se reescribe al soltar). */

export const TASK_COLUMNS = ["backlog", "en_progreso", "en_revision", "hecho"] as const;
export type TaskColumn = (typeof TASK_COLUMNS)[number];
export const TASK_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    assignedTo: text("assigned_to"), // username
    createdBy: text("created_by").notNull(),
    column: text("column").notNull().default("backlog"), // TaskColumn
    sortOrder: integer("sort_order").notNull().default(0),
    priority: text("priority").notNull().default("media"), // TaskPriority
    dueDate: timestamp("due_date", { withTimezone: true }),
    labels: jsonb("labels").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_column_idx").on(t.column, t.sortOrder)],
);

export const taskComments = pgTable(
  "task_comments",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("task_comments_task_idx").on(t.taskId)],
);

/* ───────────────────────── relations ───────────────────────── */

export const citiesRelations = relations(cities, ({ many }) => ({
  zones: many(zones),
}));

export const zonesRelations = relations(zones, ({ one, many }) => ({
  city: one(cities, { fields: [zones.cityId], references: [cities.id] }),
  coverage: many(coverage),
  businesses: many(businesses),
}));

export const coverageRelations = relations(coverage, ({ one }) => ({
  zone: one(zones, { fields: [coverage.zoneId], references: [zones.id] }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  zone: one(zones, { fields: [businesses.zoneId], references: [zones.id] }),
  audits: many(audits),
  notes: many(notes),
  pipelineRuns: many(pipelineRuns),
  agentTasks: many(agentTasks),
  researchProfiles: many(researchProfiles),
  competitorAnalyses: many(competitorAnalyses),
  outreachMessages: many(outreachMessages),
}));

export const auditsRelations = relations(audits, ({ one }) => ({
  business: one(businesses, { fields: [audits.businessId], references: [businesses.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  business: one(businesses, { fields: [notes.businessId], references: [businesses.id] }),
}));

export const pipelineRunsRelations = relations(pipelineRuns, ({ one, many }) => ({
  business: one(businesses, {
    fields: [pipelineRuns.businessId],
    references: [businesses.id],
  }),
  tasks: many(agentTasks),
}));

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
  business: one(businesses, {
    fields: [agentTasks.businessId],
    references: [businesses.id],
  }),
  run: one(pipelineRuns, { fields: [agentTasks.runId], references: [pipelineRuns.id] }),
}));
