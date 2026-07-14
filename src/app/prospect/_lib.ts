/** Shared client-side helpers, types and formatting for the prospect dashboard. */

export const LEAD_STATUS_OPTIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "en_conversacion", label: "En conversación" },
  { value: "propuesta_enviada", label: "Propuesta enviada" },
  { value: "cerrado", label: "Cerrado" },
  { value: "descartado", label: "Descartado" },
] as const;

// Human labels for audit issue codes (shown as chips).
export const ISSUE_LABELS: Record<string, string> = {
  site_unreachable: "Web caída",
  perf_mobile_critical: "Móvil muy lenta",
  perf_mobile_poor: "Móvil lenta",
  perf_desktop_critical: "Desktop muy lento",
  perf_desktop_poor: "Desktop lento",
  seo_poor: "SEO bajo",
  accessibility_poor: "Accesibilidad baja",
  no_https: "Sin HTTPS",
  no_chat: "Sin chat/WhatsApp",
  no_ecommerce_expected: "Sin e-commerce",
  few_reviews: "Muy pocas reviews",
  low_reviews: "Pocas reviews",
};

export function issueLabel(code: string): string {
  return ISSUE_LABELS[code] ?? code;
}

/** Tailwind classes for a score badge: red (hot lead) → green (cold). */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-white/5 text-[var(--ink-mute)] border-white/10";
  if (score >= 70) return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  if (score >= 45) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (score >= 20) return "bg-sky-500/15 text-sky-300 border-sky-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

export function statusColor(status: string): string {
  switch (status) {
    case "completada":
      return "text-emerald-300";
    case "completada_parcial":
      return "text-amber-300";
    case "en_progreso":
      return "text-sky-300";
    case "error":
      return "text-rose-300";
    default:
      return "text-[var(--ink-mute)]";
  }
}

export const AGENT_LABELS: Record<string, string> = {
  research: "Research",
  audit_seo: "Audit/SEO",
  copywriting: "Copywriting",
  orchestrator: "Orchestrator",
};

/** Tailwind text/bg for an agent_task / pipeline status. */
export function taskStatusColor(status: string): string {
  switch (status) {
    case "completada":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "en_progreso":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30 animate-pulse";
    case "error":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    default:
      return "bg-white/5 text-[var(--ink-mute)] border-white/10";
  }
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `HTTP ${res.status}`);
  return res.json();
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Shared shapes (mirror the API responses) ──
export type LeadRow = {
  id: number;
  name: string;
  category: string | null;
  country: string | null;
  city: string | null;
  zone: string | null;
  website: string | null;
  phone: string | null;
  rating: number | null;
  reviewsCount: number | null;
  opportunityScore: number | null;
  auditStatus: string;
  leadStatus: string;
  lastAuditedAt: string | null;
  issues?: string[] | null;
};

export type CoverageRow = {
  id: number;
  country: string;
  city: string | null;
  zone: string;
  zoneId: number;
  category: string;
  status: string;
  lastRunAt: string | null;
  resultsCount: number;
  nextRefreshAt: string | null;
  apiCallsUsed: number;
  errorMessage: string | null;
  needsRefresh: boolean;
  /** Real businesses in this zone×category and how many are audited (one grouped query server-side). */
  bizTotal: number;
  bizAudited: number;
};

export type CountryProgress = { country: string; covered: number; planned: number };
export type Category = { id: string; label: string; query: string; expectsEcommerce?: boolean };
