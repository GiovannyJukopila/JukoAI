"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet, apiSend } from "../../../_lib";
import { Meter, Icons, Spinner } from "../../../_components/viz";

type Evidence = {
  signalId: number;
  platform: string;
  title: string | null;
  url: string | null;
  author: string | null;
  metrics: Record<string, number> | null;
  fetchedAt: string;
  observedAt: string | null;
};
type Score = {
  momentum: number | null; volume: number | null; crossPlatform: number | null;
  competition: number | null; evergreen: number | null; confidence: number | null;
} | null;
type Idea = {
  id: number;
  kind: string;
  title: string;
  hook: string | null;
  claudeImpl: string | null;
  combo: string | null;
  platform: string | null;
  steps: string[] | null;
  impact: string | null;
  difficulty: string | null;
  status: string;
};
type TrendDetail = {
  trend: { id: number; title: string; summary: string | null; status: string; category: string | null; platforms: string[] | null; lastSeenAt: string };
  score: Score;
  evidence: Evidence[];
  observations: { id: number; observedAt: string; volume: number; engagement: number; sourcesCount: number }[];
  ideas: Idea[];
};

const STATUS_LABEL: Record<string, string> = {
  emerging: "Emergente", rising: "Subiendo", peaking: "Pico", declining: "Bajando", evergreen: "Perenne", dormant: "Latente",
};
const PLATFORM_LABEL: Record<string, string> = { hacker_news: "Hacker News", google_news: "Google News", google_trends: "Google Trends", reddit: "Reddit" };
const NET_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", facebook: "Facebook" };

export default function TrendDetailPage() {
  const params = useParams<{ id: string }>();
  const [d, setD] = useState<TrendDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [gen, setGen] = useState(false);

  const load = useCallback(() => {
    return apiGet<TrendDetail>(`/api/prospect/intel/trends/${params.id}`)
      .then(setD)
      .catch((e) => setErr((e as Error).message));
  }, [params.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function generateIdeas() {
    setGen(true);
    try {
      await apiSend(`/api/prospect/intel/trends/${params.id}/ideas`, "POST");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGen(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--ink-mute)]">Cargando…</p>;
  if (err || !d) return <p className="text-sm text-rose-300">No se pudo cargar el trend. {err}</p>;

  const s = d.score;
  return (
    <div className="space-y-5">
      <Link href="/prospect/intel" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-mute)] transition-colors hover:text-white">
        <span aria-hidden>←</span> Content Intelligence
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--peri)]/25 bg-[var(--peri)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--peri)]">
              {STATUS_LABEL[d.trend.status] ?? d.trend.status}
            </span>
            {d.trend.category && <span className="text-xs text-[var(--ink-mute)]">{d.trend.category}</span>}
          </div>
          <h1 className="max-w-3xl text-xl font-semibold leading-snug">{d.trend.title}</h1>
          {d.trend.summary && <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">{d.trend.summary}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(d.trend.platforms ?? []).map((p) => (
              <span key={p} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]">{PLATFORM_LABEL[p] ?? p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Ideas: trend × Claude — the star feature */}
      <div className="pa-card p-4" style={{ borderColor: "rgba(142,143,250,.28)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <span aria-hidden>✨</span> Ideas: este trend <span className="text-[var(--peri)]">×</span> Claude
            </h3>
            <p className="mt-0.5 text-xs text-[var(--ink-mute)]">Videos y proyectos implementando Claude (MCP · Claude Code · Agent SDK · API) sobre esta tendencia.</p>
          </div>
          <button onClick={generateIdeas} disabled={gen}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--violet)] to-[var(--peri)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(119,82,254,.7)] transition-all hover:brightness-110 disabled:opacity-60">
            {gen ? <><Spinner size={14} /> Generando…</> : <>{Icons.bolt(15)} {d.ideas.length ? "Generar más" : "Generar ideas con Claude"}</>}
          </button>
        </div>

        {gen && d.ideas.length === 0 && <p className="mt-3 text-sm text-sky-200">Pensando ideas con claude -p… (~1-2 min)</p>}
        {!gen && d.ideas.length === 0 && (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">Aún no hay ideas. Pulsa el botón para que Claude proponga videos y proyectos de alto impacto combinando esta tendencia con Claude.</p>
        )}

        {d.ideas.length > 0 && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {d.ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        )}
      </div>

      {/* Scores */}
      <div className="pa-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <span aria-hidden className="h-3.5 w-1 rounded-full bg-gradient-to-b from-[var(--sky)] to-[var(--violet)]" />
          Puntuaciones <span className="text-[11px] font-normal text-[var(--ink-mute)]">(calculadas de métricas reales, método v1)</span>
        </h3>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Meter label="Momentum" value={s?.momentum ?? null} good={false} />
          <Meter label="Confianza" value={s?.confidence ?? null} />
          <Meter label="Volumen" value={s?.volume ?? null} />
          <Meter label="Cross-platform" value={s?.crossPlatform ?? null} />
          <Meter label="Perenne (evergreen)" value={s?.evergreen ?? null} />
          <Meter label="Competencia" value={s?.competition ?? null} good={false} />
        </div>
      </div>

      {/* Evidence — the citable proof */}
      <div className="pa-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
          <span aria-hidden className="h-3.5 w-1 rounded-full bg-gradient-to-b from-[var(--sky)] to-[var(--violet)]" />
          Evidencia <span className="text-[11px] font-normal text-[var(--ink-mute)]">({d.evidence.length} señales reales)</span>
        </h3>
        <ul className="divide-y divide-white/5">
          {d.evidence.map((e) => (
            <li key={e.signalId} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--peri)]">{Icons.research(15)}</span>
              <div className="min-w-0 flex-1">
                <a href={e.url ?? "#"} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-white hover:text-[var(--peri)]">
                  <span className="truncate">{e.title ?? e.url}</span>
                  <span className="shrink-0 text-[var(--ink-mute)]">{Icons.external(12)}</span>
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--ink-mute)]">
                  <span>{PLATFORM_LABEL[e.platform] ?? e.platform}</span>
                  {e.author && <span>· {e.author}</span>}
                  {e.metrics?.points != null && <span className="font-mono tabular-nums">· {e.metrics.points} pts</span>}
                  {e.metrics?.comments != null && <span className="font-mono tabular-nums">· {e.metrics.comments} coment.</span>}
                  <span>· {new Date(e.observedAt ?? e.fetchedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
                </div>
              </div>
            </li>
          ))}
          {d.evidence.length === 0 && <li className="py-4 text-center text-xs text-[var(--ink-mute)]">Sin evidencia registrada.</li>}
        </ul>
      </div>
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const isProject = idea.kind === "proyecto";
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isProject ? "bg-sky-500/15 text-sky-300" : "bg-rose-500/15 text-rose-200"}`}>
          {isProject ? "🛠 Proyecto" : "🎬 Video"}
        </span>
        {idea.platform && <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]">{NET_LABEL[idea.platform] ?? idea.platform}</span>}
        {idea.claudeImpl && <span className="rounded bg-[var(--violet)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--peri)]">Claude · {idea.claudeImpl}</span>}
        {idea.difficulty && <span className="ml-auto text-[10px] text-[var(--ink-mute)]">dif. {idea.difficulty}</span>}
      </div>
      <h4 className="text-sm font-semibold leading-snug text-white">{idea.title}</h4>
      {idea.combo && <p className="mt-0.5 text-[11px] text-[var(--ink-mute)]">Combina con: <span className="text-[var(--ink-soft)]">{idea.combo}</span></p>}
      {idea.hook && <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-xs text-[var(--ink-soft)]"><span className="text-[var(--ink-mute)]">{isProject ? "Idea: " : "Hook: "}</span>{idea.hook}</p>}
      {idea.steps && idea.steps.length > 0 && (
        <ol className="mt-2 space-y-1">
          {idea.steps.map((st, i) => (
            <li key={i} className="flex gap-2 text-xs text-[var(--ink-soft)]">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-white/5 text-[9px] text-[var(--peri)]">{i + 1}</span>
              <span>{st}</span>
            </li>
          ))}
        </ol>
      )}
      {idea.impact && <p className="mt-2 text-[11px] italic text-[var(--ink-mute)]">💡 {idea.impact}</p>}
    </div>
  );
}
