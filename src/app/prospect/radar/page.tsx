"use client";
/**
 * Radar IA (Fase 5) — top trends sobre Claude/Anthropic, OpenAI e IA para
 * contenido. Refresh SIEMPRE manual (agente claude -p con WebSearch, sobre la
 * suscripción Pro). La sección abre mostrando el último run cacheado (5.4).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { apiGet, apiSend } from "../_lib";
import { useLang } from "../_i18n";

type RadarItem = {
  id: number; topic: string; source: string; title: string; summary: string | null;
  url: string | null; sentiment: string | null; relevance: number | null; publishedHint: string | null;
};
type Resp = { run: { id: number; finishedAt: string; stats: Record<string, number> | null } | null; items: RadarItem[] };

const TOPIC_STYLE: Record<string, string> = {
  claude: "border-[var(--peri)]/40 bg-[var(--peri)]/10 text-[var(--peri)]",
  openai: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  content_ai: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
};
const SENTIMENT_DOT: Record<string, string> = {
  positivo: "bg-emerald-400",
  neutral: "bg-white/30",
  negativo: "bg-rose-400",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function SourceIcon({ source, size = 13 }: { source: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  if (source === "x") return <svg {...common}><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23z" /></svg>;
  if (source === "reddit") return <svg {...common}><path d="M22 12.06c0-1.2-.97-2.17-2.17-2.17-.58 0-1.1.23-1.49.6a10.6 10.6 0 0 0-5.6-1.77l1.13-3.6 3.06.72a1.6 1.6 0 1 0 .17-.78l-3.43-.8a.4.4 0 0 0-.47.26l-1.3 4.2a10.65 10.65 0 0 0-5.73 1.76 2.17 2.17 0 1 0-2.6 3.44c-.04.24-.06.49-.06.74 0 3.36 3.87 6.09 8.64 6.09s8.64-2.73 8.64-6.1c0-.24-.02-.48-.06-.71.77-.36 1.27-1.13 1.27-1.98zM7.5 13.75a1.35 1.35 0 1 1 2.7 0 1.35 1.35 0 0 1-2.7 0zm7.7 3.83c-.75.75-2 1.11-3.2 1.11s-2.45-.36-3.2-1.1a.4.4 0 1 1 .57-.58c.55.55 1.56.86 2.63.86s2.08-.3 2.63-.86a.4.4 0 1 1 .57.57zm-.36-2.48a1.35 1.35 0 1 1 0-2.7 1.35 1.35 0 0 1 0 2.7z" /></svg>;
  return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" /></svg>;
}

export default function RadarPage() {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<Resp | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fSource, setFSource] = useState("");
  const [fTopic, setFTopic] = useState("");

  const load = useCallback(async () => {
    try { setData(await apiGet<Resp>("/api/prospect/radar")); } catch { /* transient */ }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function refresh() {
    setScanning(true);
    setError(null);
    try {
      setData(await apiSend<Resp>("/api/prospect/radar/refresh", "POST"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }

  const items = useMemo(
    () => (data?.items ?? []).filter((i) => (!fSource || i.source === fSource) && (!fTopic || i.topic === fTopic)),
    [data, fSource, fTopic],
  );

  const topicLabel: Record<string, string> = { claude: t.radar.tClaude, openai: t.radar.tOpenai, content_ai: t.radar.tContent };
  const sourceLabel: Record<string, string> = { x: t.radar.srcX, reddit: t.radar.srcReddit, news: t.radar.srcNews };
  const sentimentLabel: Record<string, string> = { positivo: t.radar.sPositivo, neutral: t.radar.sNeutral, negativo: t.radar.sNegativo };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.radar.title}</h1>
          <p className="text-sm text-[var(--ink-mute)]">{t.radar.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.run && (
            <span className="text-xs text-[var(--ink-mute)]" aria-live="polite">
              {t.radar.lastUpdate(timeAgo(data.run.finishedAt))}
            </span>
          )}
          <button onClick={refresh} disabled={scanning}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--violet)] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--violet)]/25 transition-opacity hover:opacity-90 disabled:opacity-60">
            {/* Barrido de radar: gira mientras escanea */}
            <motion.span
              animate={scanning && !reduceMotion ? { rotate: 360 } : { rotate: 0 }}
              transition={scanning ? { repeat: Infinity, duration: 1.4, ease: "linear" } : { duration: 0.2 }}
              className="grid place-items-center"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19.07 4.93A10 10 0 1 0 22 12" /><path d="m12 12 7-7" />
              </svg>
            </motion.span>
            {scanning ? t.radar.refreshing : t.radar.refresh}
          </button>
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">⚠ {t.radar.error}: {error}</p>}

      {/* Filtros por fuente y tema (5.3) */}
      {data?.run && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-mute)]">{t.radar.fSource}</span>
          {["", "x", "reddit", "news"].map((s) => (
            <button key={s || "all"} onClick={() => setFSource(s)} aria-pressed={fSource === s}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                fSource === s ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5"
              }`}>
              {s ? sourceLabel[s] : t.radar.all}
            </button>
          ))}
          <span className="ml-3 text-xs font-medium uppercase tracking-wide text-[var(--ink-mute)]">{t.radar.fTopic}</span>
          {["", "claude", "openai", "content_ai"].map((x) => (
            <button key={x || "all"} onClick={() => setFTopic(x)} aria-pressed={fTopic === x}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                fTopic === x ? "border-[var(--peri)]/50 bg-[var(--peri)]/15 text-white" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5"
              }`}>
              {x ? topicLabel[x] : t.radar.all}
            </button>
          ))}
        </div>
      )}

      {/* Estado vacío inicial */}
      {data && !data.run && !scanning && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <motion.div
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[var(--peri)]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M19.07 4.93A10 10 0 1 0 22 12" /><path d="M15.54 8.46A5 5 0 1 0 17 12" /><path d="m12 12 7-7" />
            </svg>
          </motion.div>
          <p className="text-sm text-[var(--ink-soft)]">{t.radar.never}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-[var(--ink-mute)]">{t.radar.neverSub}</p>
        </div>
      )}

      {/* Skeletons mientras escanea (nunca spinner genérico) */}
      {scanning && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div key={i}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.15 }}
              className="h-40 rounded-2xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      )}

      {/* Cards de resultados (5.2) */}
      {!scanning && data?.run && (
        <>
          {items.length === 0 && <p className="py-8 text-center text-sm text-[var(--ink-mute)]">{t.radar.empty}</p>}
          <motion.div layout={!reduceMotion} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {items.map((it, i) => (
                <motion.article
                  key={it.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.24, ease: "easeOut", delay: Math.min(i * 0.04, 0.4) }}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-[var(--ink-soft)]"><SourceIcon source={it.source} /> {sourceLabel[it.source] ?? it.source}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TOPIC_STYLE[it.topic] ?? TOPIC_STYLE.claude}`}>{topicLabel[it.topic] ?? it.topic}</span>
                    {it.publishedHint && <span className="ml-auto text-[10px] text-[var(--ink-mute)]">{it.publishedHint}</span>}
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-white">{it.title}</h3>
                  {it.summary && <p className="line-clamp-3 text-xs leading-relaxed text-[var(--ink-soft)]">{it.summary}</p>}
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    {it.sentiment && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--ink-mute)]">
                        <span className={`h-1.5 w-1.5 rounded-full ${SENTIMENT_DOT[it.sentiment] ?? SENTIMENT_DOT.neutral}`} />
                        {sentimentLabel[it.sentiment] ?? it.sentiment}
                      </span>
                    )}
                    {it.relevance != null && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--ink-mute)]" title={`${t.radar.relevance}: ${it.relevance}`}>
                        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                          <motion.span initial={{ width: 0 }} animate={{ width: `${it.relevance}%` }} transition={{ duration: 0.5, ease: "easeOut" }} className="block h-full rounded-full bg-gradient-to-r from-[var(--peri)] to-[var(--violet)]" />
                        </span>
                        {it.relevance}
                      </span>
                    )}
                    {it.url && (
                      <a href={it.url} target="_blank" rel="noreferrer" title={t.radar.open}
                        className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-[var(--ink-soft)] transition-colors hover:bg-white/5 hover:text-white">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>
                        {t.radar.open}
                      </a>
                    )}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
