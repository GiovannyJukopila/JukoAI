CREATE TABLE "agent_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"run_id" integer,
	"agent" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"result" jsonb,
	"error_message" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"operation" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"business_id" integer,
	"task_id" integer,
	"request_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"audited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"psi_mobile_performance" integer,
	"psi_mobile_seo" integer,
	"psi_mobile_accessibility" integer,
	"psi_mobile_best_practices" integer,
	"psi_desktop_performance" integer,
	"psi_desktop_seo" integer,
	"psi_desktop_accessibility" integer,
	"psi_desktop_best_practices" integer,
	"has_https" boolean,
	"has_chat_widget" boolean,
	"chat_vendor" text,
	"is_ecommerce" boolean,
	"ecommerce_platform" text,
	"tech_signals" jsonb,
	"issues" jsonb,
	"opportunity_score" integer,
	"http_status" integer,
	"psi_error" text,
	"fetch_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"address" text,
	"lat" real,
	"lng" real,
	"phone" text,
	"international_phone" text,
	"website" text,
	"rating" real,
	"reviews_count" integer,
	"business_status" text,
	"google_types" jsonb,
	"country" text,
	"zone_id" integer,
	"raw" jsonb,
	"opportunity_score" integer,
	"audit_status" text DEFAULT 'none' NOT NULL,
	"last_audited_at" timestamp with time zone,
	"lead_status" text DEFAULT 'nuevo' NOT NULL,
	"lead_status_updated_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"competitors" jsonb,
	"content_gaps" jsonb,
	"seo_gaps" jsonb,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coverage" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone_id" integer NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"last_run_at" timestamp with time zone,
	"results_count" integer DEFAULT 0 NOT NULL,
	"refresh_interval_days" integer DEFAULT 90 NOT NULL,
	"next_refresh_at" timestamp with time zone,
	"api_calls_used" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"content_ideas" jsonb,
	"model" text,
	"status" text DEFAULT 'borrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"total_cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"summary" text,
	"social_links" jsonb,
	"strengths" jsonb,
	"opportunities" jsonb,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"account_name" text NOT NULL,
	"external_id" text,
	"access_token_ref" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer,
	"outreach_message_id" integer,
	"social_account_id" integer,
	"platform" text NOT NULL,
	"content" text NOT NULL,
	"media" jsonb,
	"status" text DEFAULT 'borrador' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"external_post_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"region" text,
	"name" text NOT NULL,
	"display_name" text,
	"lat" real,
	"lng" real,
	"planned" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_task_id_agent_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."agent_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_analyses" ADD CONSTRAINT "competitor_analyses_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coverage" ADD CONSTRAINT "coverage_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_profiles" ADD CONSTRAINT "research_profiles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_outreach_message_id_outreach_messages_id_fk" FOREIGN KEY ("outreach_message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tasks_business_idx" ON "agent_tasks" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "agent_tasks_run_idx" ON "agent_tasks" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "api_usage_provider_idx" ON "api_usage" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "api_usage_created_idx" ON "api_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audits_business_idx" ON "audits" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_place_id_uniq" ON "businesses" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "businesses_zone_idx" ON "businesses" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "businesses_category_idx" ON "businesses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "businesses_score_idx" ON "businesses" USING btree ("opportunity_score");--> statement-breakpoint
CREATE INDEX "businesses_lead_status_idx" ON "businesses" USING btree ("lead_status");--> statement-breakpoint
CREATE INDEX "competitor_analyses_business_idx" ON "competitor_analyses" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coverage_zone_category_uniq" ON "coverage" USING btree ("zone_id","category");--> statement-breakpoint
CREATE INDEX "coverage_status_idx" ON "coverage" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notes_business_idx" ON "notes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "outreach_messages_business_idx" ON "outreach_messages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "pipeline_runs_business_idx" ON "pipeline_runs" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "research_profiles_business_idx" ON "research_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "social_posts_status_idx" ON "social_posts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "zones_country_name_uniq" ON "zones" USING btree ("country","name");