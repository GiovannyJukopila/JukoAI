/**
 * Single shared Drizzle/Postgres connection pool.
 *
 * In Next.js dev the module graph is reloaded on every change, which would
 * otherwise open a new pool each time and exhaust Postgres connections. We cache
 * the pool on globalThis to survive hot reloads.
 */
import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "@/server/config/env";
import * as schema from "@/server/db/schema";

const globalForDb = globalThis as unknown as {
  __prospectPool?: Pool;
  __prospectDb?: NodePgDatabase<typeof schema>;
};

export const pool =
  globalForDb.__prospectPool ??
  new Pool({ connectionString: env.DATABASE_URL, max: 10 });

export const db: NodePgDatabase<typeof schema> =
  globalForDb.__prospectDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__prospectPool = pool;
  globalForDb.__prospectDb = db;
}

export { schema };
