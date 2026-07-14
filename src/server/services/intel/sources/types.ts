/**
 * Collector contract. Sources are DETERMINISTIC code that fetch real items from
 * the open internet and return them as RawSignalInput — no LLM, no invention.
 * Every popularity number lives in `metrics`; every item keeps a citable `url`.
 */
import type { SourceKind } from "@/server/db/schema";

export type RawSignalInput = {
  externalId?: string | null;
  url?: string | null;
  title: string;
  body?: string | null;
  author?: string | null;
  lang?: string | null;
  region?: string | null;
  metrics?: Record<string, number>;
  keywords?: string[];
  observedAt?: Date | null;
  raw?: unknown;
};

export type CollectContext = { limit: number };

export interface Source {
  platform: string; // stable machine id, e.g. "hacker_news"
  kind: SourceKind;
  label: string; // human label, unique per platform
  requiresKey: boolean; // paid/authenticated sources stay disabled until configured
  fetch(ctx: CollectContext): Promise<RawSignalInput[]>;
}
