"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend } from "../_lib";
import { StatCard, Spinner, Icons } from "../_components/viz";

type TrendItem = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  category: string | null;
  platforms: string[];
  status: string;
  latestAt: string | null;
  isFresh: boolean;
  evidenceCount: number;
  momentum: number | null;
  volume: number | null;
  confidence: number | null;
  competition: number | null;
  evergreen: number | null;
  crossPlatform: number | null;
};
type Kpis = { trends: number; signals: number; sources: number; fresh: number };
type LastRun = { kind: string; finishedAt: string | null; stats: Record<string, number> | null } | null;
type Resp = { trends: TrendItem[]; kpis: Kpis; byStatus: { status: string; n: number }[]; lastRun: LastRun };

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

const SOURCE_LABEL: Record<string, string> = {
  hacker_news: "Hacker News", google_news: "Google News", reddit: "Reddit",
};
// Networks Juko creates content for — every trend is a candidate to post on all four.
const TARGET_NETWORKS = ["Instagram", "TikTok", "YouTube", "Facebook"];

export default function IntelPage() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "fast" | "ai">(null);
  const [source, setSource] = useState("");
  const [onlyFresh, setOnlyFresh] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiGet<Resp>(`/api/prospect/intel/trends`));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function analyze(ai: boolean) {
    setRunning(ai ? "ai" : "fast");
    setMsg(null);
    try {
      const r = await apiSend<{ collect: { inserted: number; skipped: number }; synth: { trends: number; strategy: string; signals: number } }>(
        "/api/prospect/intel/collect", "POST", { ai },
      );
      setMsg(`✅ Radar actualizado: +${r.collect.inserted} señales nuevas del nicho (${r.collect.skipped} off-topic descartadas) · ${r.synth.trends} trends detectados${r.synth.strategy === "ai" ? " con IA" : ""}.`);
      await load();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }

  const allTrends = data?.trends ?? [];
  const sources = useMemo(() => [...new Set(allTrends.flatMap((t) => t.platforms))].sort(), [allTrends]);
  const trends = useMemo(
    () => allTrends.filter((t) => (!source || t.platforms.includes(source)) && (!onlyFresh || t.isFresh)),
    [allTrends, source, onlyFresh],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-[var(--violet)]/20 px-3 py-1.5 text-sm text-white">Trend Radar</span>
        <Link href="/prospect/intel/opportunities" className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-soft)] transition-colors hover:bg-white/5 hover:text-white">Oportunidades</Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold">Content Intelligence · IA & Agentes</h1>
        <p className="text-sm text-[var(--ink-mute)]">
          Tendencias reales sobre Claude, IA, agentes, automatización y software — para crear contenido y vender.
        </p>
      </div>

      {/* Update panel — self-explanatory: what each action does + last run */}
      <div className="pa-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[var(--ink-soft)]">Última actualización: <strong className="text-white">{timeAgo(data?.lastRun?.finishedAt)}</strong></span>
            <span className="text-[var(--ink-mute)]">· {data?.kpis.trends ?? 0} trends · {data?.kpis.fresh ?? 0} recién salidos</span>
          </div>
          <span className="text-xs text-[var(--ink-mute)]">Trae lo último de Hacker News + Google News y lo agrupa en tendencias.</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {/* Daily action */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--peri)]/25 bg-[var(--peri)]/[0.05] p-3">
            <button onClick={() => analyze(false)} disabled={!!running}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--violet)] to-[var(--peri)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(119,82,254,.7)] transition-all hover:brightness-110 disabled:opacity-60">
              {running === "fast" ? <><Spinner size={14} /> Actualizando…</> : <>{Icons.refresh(15)} Actualizar ahora</>}
            </button>
            <div className="min-w-0 text-xs leading-snug text-[var(--ink-soft)]">
              <div className="font-medium text-white">Para el día a día</div>
              Rápido (segundos). Trae señales nuevas y detecta trends. <span className="text-[var(--ink-mute)]">Sin IA.</span>
            </div>
          </div>

          {/* Occasional AI refine */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <button onClick={() => analyze(true)} disabled={!!running}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[var(--peri)]/40 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[var(--peri)] transition-colors hover:bg-white/[0.06] disabled:opacity-60">
              {running === "ai" ? <><Spinner size={14} /> Refinando…</> : <>✨ Refinar con IA</>}
            </button>
            <div className="min-w-0 text-xs leading-snug text-[var(--ink-soft)]">
              <div className="font-medium text-white">De vez en cuando</div>
              ~2 min. Reescribe nombres y resúmenes con Claude. <span className="text-[var(--ink-mute)]">Mismos datos, mejor redactados.</span>
            </div>
          </div>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-[var(--peri)]/30 bg-[var(--peri)]/[0.06] px-4 py-2.5 text-sm text-[var(--ink-soft)]">{msg}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Trends" value={data?.kpis.trends ?? "—"} icon={Icons.bolt(16)} />
        <StatCard label="Recién salido · 24h" value={data?.kpis.fresh ?? "—"} accent="#fb7185" sub="señales de las últimas 24h" />
        <StatCard label="Señales" value={data?.kpis.signals ?? "—"} accent="#8E8FFA" sub="evidencia recopilada" icon={Icons.research(16)} />
        <StatCard label="Fuentes activas" value={data?.kpis.sources ?? "—"} accent="#34d399" />
      </div>

      {/* Honest provenance banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs text-[var(--ink-mute)]">
        <span className="flex items-center gap-1.5 text-[var(--ink-soft)]">{Icons.alert(14)} Fuentes en vivo (sin API): <strong className="text-white">Hacker News</strong> y <strong className="text-white">Google News</strong> filtradas al nicho IA/Claude/agentes.</span>
        <span>Instagram · TikTok · YouTube · Facebook requieren conectar su API para trends nativos — cada trend te sugiere en qué red publicarlo.</span>
      </div>

      {/* Source filter + freshness */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--ink-mute)]">Fuente:</span>
        <Chip active={!source} onClick={() => setSource("")}>Todas</Chip>
        {sources.map((s) => (
          <Chip key={s} active={source === s} onClick={() => setSource(s)}>{SOURCE_LABEL[s] ?? s}</Chip>
        ))}
        <button onClick={() => setOnlyFresh((v) => !v)}
          className={`ml-2 cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${onlyFresh ? "border-rose-400/40 bg-rose-500/15 text-rose-200" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5"}`}>
          🔥 Solo recién salido (24h)
        </button>
      </div>

      {loading && allTrends.length === 0 && <div className="pa-card p-10 text-center text-sm text-[var(--ink-mute)]">Cargando…</div>}

      {!loading && allTrends.length === 0 && (
        <div className="pa-card p-10 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-[var(--peri)]">{Icons.bolt(22)}</div>
          <p className="text-sm text-[var(--ink-soft)]">Aún no hay trends. Pulsa <strong className="text-white">Analizar ahora</strong> para recopilar señales del nicho y detectarlos.</p>
        </div>
      )}

      {!loading && allTrends.length > 0 && trends.length === 0 && (
        <div className="pa-card p-8 text-center text-sm text-[var(--ink-mute)]">Ningún trend con este filtro.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trends.map((t) => <TrendCard key={t.id} t={t} />)}
      </div>
    </div>
  );
}

function TrendCard({ t }: { t: TrendItem }) {
  return (
    <Link href={`/prospect/intel/trends/${t.id}`} className="pa-card pa-card--hover group flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {t.isFresh && <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-200">🔥 Recién salido</span>}
          {t.platforms.map((p) => (
            <span key={p} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]">{SOURCE_LABEL[p] ?? p}</span>
          ))}
        </div>
        <span className="font-mono text-xs tabular-nums text-[var(--ink-mute)]">{t.evidenceCount} ev.</span>
      </div>
      <h3 className="text-[0.95rem] font-semibold leading-snug text-white group-hover:text-[var(--peri)]">{t.title}</h3>
      {t.summary && <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-soft)]">{t.summary}</p>}

      <div className="mt-3 space-y-1.5">
        <ScoreBar label="Momentum" value={t.momentum} tone="hot" />
        <ScoreBar label="Confianza" value={t.confidence} tone="good" />
        <ScoreBar label="Volumen" value={t.volume} tone="cool" />
      </div>

      <div className="mt-3 border-t border-white/5 pt-3">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">Publicar en</div>
        <div className="flex flex-wrap gap-1.5">
          {TARGET_NETWORKS.map((n) => (
            <span key={n} className="rounded bg-[var(--violet)]/12 px-1.5 py-0.5 text-[10px] text-[var(--peri)]">{n}</span>
          ))}
          <span className="ml-auto text-[11px] text-[var(--ink-mute)] opacity-0 transition-opacity group-hover:opacity-100">evidencia →</span>
        </div>
      </div>
    </Link>
  );
}

function ScoreBar({ label, value, tone }: { label: string; value: number | null; tone: "hot" | "good" | "cool" }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color = tone === "hot" ? "#fb7185" : tone === "good" ? "#34d399" : "#38bdf8";
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-[var(--ink-mute)]">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${v}%`, background: color }} />
      </span>
      <span className="w-7 shrink-0 text-right font-mono text-[11px] tabular-nums" style={{ color }}>{value ?? "—"}</span>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-[var(--peri)]/40 bg-[var(--violet)]/20 text-white" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5"}`}>
      {children}
    </button>
  );
}
