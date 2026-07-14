"use client";
/**
 * Reusable visual primitives for the prospect dashboard: SVG icons (no emoji),
 * a circular score gauge, labelled meters/progress bars, flag pills and agent
 * status cards. Dark-theme, tabular numbers, accessible (aria + not color-only).
 */
import type { ReactNode } from "react";
import { useLang } from "../_i18n";

/* ── SVG icon set (stroke, currentColor) ───────────────────────────── */
const I = (p: { children: ReactNode; size?: number }) => (
  <svg
    width={p.size ?? 16}
    height={p.size ?? 16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {p.children}
  </svg>
);
export const Icons = {
  check: (s?: number) => <I size={s}><path d="M20 6 9 17l-5-5" /></I>,
  x: (s?: number) => <I size={s}><path d="M18 6 6 18M6 6l12 12" /></I>,
  research: (s?: number) => <I size={s}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></I>,
  seo: (s?: number) => <I size={s}><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="4" width="3" height="14" /></I>,
  copy: (s?: number) => <I size={s}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></I>,
  bolt: (s?: number) => <I size={s}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></I>,
  clock: (s?: number) => <I size={s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>,
  alert: (s?: number) => <I size={s}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></I>,
  refresh: (s?: number) => <I size={s}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></I>,
  external: (s?: number) => <I size={s}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></I>,
  mail: (s?: number) => <I size={s}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></I>,
  phone: (s?: number) => <I size={s}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></I>,
};

/* ── Inline spinner (for buttons in a processing state) ────────────── */
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ── Circular score gauge ──────────────────────────────────────────── */
export function ScoreRing({
  value,
  label,
  caption,
  size = 132,
  invert = false,
}: {
  value: number | null | undefined;
  label?: string;
  caption?: string;
  size?: number;
  /** invert=true: high value = bad/hot (opportunity). false: high = good (PSI). */
  invert?: boolean;
}) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const color = value == null ? "var(--ink-mute)" : invert ? hotColor(v) : goodColor(v);
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label ?? "score"}: ${value ?? "sin dato"} de 100`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray .6s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color }}>
            {value ?? "—"}
          </span>
          {label && <span className="text-[11px] uppercase tracking-wide text-[var(--ink-mute)]">{label}</span>}
        </div>
      </div>
      {caption && <span className="mt-1 text-xs text-[var(--ink-mute)]">{caption}</span>}
    </div>
  );
}

/* ── Horizontal labelled meter (0-100) ─────────────────────────────── */
export function Meter({ label, value, good = true }: { label: string; value: number | null; good?: boolean }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color = value == null ? "var(--ink-mute)" : good ? goodColor(v) : hotColor(v);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--ink-soft)]">{label}</span>
        <span className="font-mono tabular-nums" style={{ color }}>{value ?? "—"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: color, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
      </div>
    </div>
  );
}

/* ── Boolean flag pill ─────────────────────────────────────────────── */
export function FlagPill({ label, ok, extra }: { label: string; ok: boolean | null | undefined; extra?: string | null }) {
  const positive = !!ok;
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <span className="text-sm text-[var(--ink-soft)]">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
          positive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"
        }`}
      >
        {positive ? Icons.check(13) : Icons.x(13)}
        {positive ? (extra ? extra : "Sí") : "No"}
      </span>
    </div>
  );
}

/* ── Agent status card ─────────────────────────────────────────────── */
export type AgentCardData = {
  kind: "research" | "audit_seo" | "copywriting";
  title: string;
  status: string; // pendiente | en_progreso | completada | error
  inputTokens?: number | null;
  outputTokens?: number | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
};
const AGENT_ICON = { research: Icons.research, audit_seo: Icons.seo, copywriting: Icons.copy };

export function AgentCard({ data }: { data: AgentCardData }) {
  const { t, lang } = useLang();
  const s = data.status;
  const tone =
    s === "completada"
      ? "border-emerald-500/30 text-emerald-300"
      : s === "en_progreso"
        ? "border-sky-500/30 text-sky-300"
        : s === "error"
          ? "border-rose-500/30 text-rose-300"
          : "border-white/10 text-[var(--ink-mute)]";
  return (
    <div className={`rounded-2xl border bg-white/[0.025] p-4 transition-colors ${tone.split(" ")[0]}`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${tone.split(" ")[1]}`}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5">{AGENT_ICON[data.kind](16)}</span>
          <span className="text-sm font-medium text-white">{t.agents[data.kind] ?? data.title}</span>
        </div>
        <StatusDot status={s} />
      </div>
      <p className="mt-2 text-xs leading-snug text-[var(--ink-mute)]">{t.agentRoles[data.kind]}</p>
      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--ink-mute)]">
        {data.outputTokens != null && (
          <span className="font-mono tabular-nums">{(data.inputTokens ?? 0) + (data.outputTokens ?? 0)} tok</span>
        )}
        {data.finishedAt && <span>{new Date(data.finishedAt).toLocaleTimeString(lang === "en" ? "en-US" : "es-ES", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
      {data.errorMessage && <p className="mt-2 line-clamp-2 text-xs text-rose-300/80" title={data.errorMessage}>{data.errorMessage}</p>}
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const { t } = useLang();
  const dots: Record<string, string> = {
    completada: "bg-emerald-400",
    en_progreso: "bg-sky-400 animate-pulse",
    error: "bg-rose-400",
    pendiente: "bg-white/25",
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
      <span className={`h-2 w-2 rounded-full ${dots[status] ?? dots.pendiente}`} />
      {t.agentStatus[status] ?? status}
    </span>
  );
}

/* ── Stat card (KPI) ───────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string; // color for the value
  icon?: ReactNode;
}) {
  return (
    <div className="pa-card pa-card--hover p-4">
      {accent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-25 blur-2xl"
          style={{ background: accent }}
        />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-mute)]">{label}</span>
          <div className="mt-2 font-mono text-[1.7rem] font-semibold leading-none tabular-nums" style={accent ? { color: accent } : undefined}>
            {value}
          </div>
          {sub && <div className="mt-1.5 text-xs text-[var(--ink-mute)]">{sub}</div>}
        </div>
        {icon && (
          <span className="pa-kpi__icon" style={accent ? { color: accent } : { color: "var(--peri)" }}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Segmented distribution bar + legend ───────────────────────────── */
export function SegmentBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="font-mono tabular-nums text-[var(--ink-mute)]">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Score badge (chip + mini bar) for tables ──────────────────────── */
export function ScoreBadge({ value }: { value: number | null | undefined }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color = value == null ? "var(--ink-mute)" : hotColor(v);
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-right font-mono text-sm font-semibold tabular-nums" style={{ color }}>{value ?? "—"}</span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </span>
    </div>
  );
}

/* ── Coverage status pill ──────────────────────────────────────────── */
export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    completada: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    completada_parcial: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    en_progreso: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    error: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    pendiente: "border-white/10 bg-white/5 text-[var(--ink-mute)]",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${map[status] ?? map.pendiente}`}>{status}</span>;
}

/* ── color thresholds ──────────────────────────────────────────────── */
function goodColor(v: number) {
  if (v >= 90) return "#34d399"; // emerald
  if (v >= 50) return "#fbbf24"; // amber
  return "#fb7185"; // rose
}
function hotColor(v: number) {
  if (v >= 70) return "#fb7185"; // hot lead
  if (v >= 45) return "#fbbf24";
  if (v >= 20) return "#38bdf8";
  return "#34d399"; // cold
}
