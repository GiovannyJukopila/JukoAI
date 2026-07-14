/**
 * Centralized, validated environment configuration for the prospecting tool.
 *
 * - Server-only. Never import from client components.
 * - API keys are read here and nowhere else, so they are never hardcoded.
 * - Missing keys do NOT crash the app at import time; instead each value is
 *   optional and the services that need it fail loudly with a clear message.
 *   This lets the dashboard boot (and the DB work) even before keys are set.
 */
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://juko:juko_dev_pw@localhost:5433/juko_prospect"),

  // Google: one key can serve both Places and PageSpeed if both APIs are enabled.
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  PAGESPEED_API_KEY: z.string().optional(),

  // Phase 2 — AI provider for the marketing agents.
  //   "cli" = run Claude Code headless using your Pro/Max SUBSCRIPTION (no API credit).
  //   "api" = call the Anthropic API directly (needs ANTHROPIC_API_KEY + credit balance).
  AI_PROVIDER: z.enum(["cli", "api"]).default("cli"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  // Model alias passed to `claude -p --model` for the CLI provider.
  CLAUDE_CLI_MODEL: z.string().default("sonnet"),
  // Path to the `claude` binary (override if not on PATH for the server process).
  CLAUDE_CLI_BIN: z.string().default("claude"),
  // Claude config dir for the CLI subprocess — pins WHICH account/subscription the
  // agents consume (e.g. ~/.claude-personal). Empty = the CLI's default (~/.claude).
  CLAUDE_CLI_CONFIG_DIR: z.string().optional(),

  DEFAULT_REFRESH_DAYS: z.coerce.number().int().positive().default(90),

  // ── Social Studio (Fase 4) ──
  // Base pública de la app para construir los redirect_uri de OAuth.
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  // Clave para cifrar tokens sociales (AES-256-GCM). Cualquier string larga;
  // se deriva con SHA-256. Sin ella, conectar cuentas falla con mensaje claro.
  SOCIAL_TOKEN_KEY: z.string().optional(),
  // LinkedIn: app con productos "Share on LinkedIn" + "Sign In with LinkedIn (OpenID)".
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  // Instagram: app Meta con "Instagram API with Instagram Login" (cuentas propias
  // como testers → sin app review).
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  // YouTube: OAuth client (Web) del proyecto GCP con YouTube Data API v3.
  // Sin audit de Google los videos se suben como PRIVADOS (se publican a mano
  // desde YouTube Studio). Distinto de GOOGLE_MAPS_API_KEY (eso es una API key).
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  // TikTok: app en developers.tiktok.com con Login Kit + Content Posting API.
  // Sin audit los videos llegan como BORRADOR a la bandeja de la app TikTok.
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  // Optional shared-secret gate for the internal tool (checked in middleware/proxy).
  PROSPECT_AUTH_TOKEN: z.string().optional(),

  // ── Authentication (login) ──
  // Configure BOTH to enable the login gate (left empty = open, for local dev).
  //   AUTH_USERS:  "usuario1:contraseña1,usuario2:contraseña2"
  //   AUTH_SECRET: a long random string used to sign the session cookie.
  AUTH_USERS: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Only thrown for malformed values (e.g. DATABASE_URL not a URL), not missing optionals.
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;

/** Resolve the PageSpeed key, falling back to the shared Google Maps key. */
export function pagespeedKey(): string | undefined {
  return env.PAGESPEED_API_KEY ?? env.GOOGLE_MAPS_API_KEY;
}

/** Throw a clear error when a required key is missing right before it's used. */
export function requireKey(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local — see README "API keys" section.`,
    );
  }
  return value;
}
