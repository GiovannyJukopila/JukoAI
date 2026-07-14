"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, type LeadRow } from "../../_lib";
import { Spinner, Icons } from "../../_components/viz";

type Opportunity = {
  id: number;
  businessId: number;
  businessName: string;
  trendId: number | null;
  trendTitle: string | null;
  title: string;
  hook: string | null;
  first3s: string | null;
  script: { beat: string }[] | null;
  cta: string | null;
  thumbnailConcept: string | null;
  platform: string | null;
  durationSeconds: number | null;
  difficulty: string | null;
  productionCost: string | null;
  editing: string[] | null;
  businessFit: number | null;
  viralityScore: number | null;
  competitionScore: number | null;
  trendConfidence: number | null;
  trendMomentum: number | null;
  evergreenScore: number | null;
  seoOpportunity: number | null;
  keywords: string[] | null;
  hashtags: string[] | null;
  postingTime: string | null;
  frequency: string | null;
  repurposing: string[] | null;
  reasoning: string | null;
  status: string;
};
type Resp = { opportunities: Opportunity[]; byStatus: { status: string; n: number }[] };

const STATUS_LABEL: Record<string, string> = {
  borrador: "Borrador", aprobada: "Aprobada", programada: "Programada", publicada: "Publicada", descartada: "Descartada",
};
const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" };

export default function OpportunitiesPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [data, setData] = useState<Resp | null>(null);
  const [pick, setPick] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : "";
      setData(await apiGet<Resp>(`/api/prospect/intel/opportunities${params}`));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiGet<{ leads: LeadRow[] }>("/api/prospect/leads?limit=300").then((d) => setLeads(d.leads)).catch(() => {});
  }, []);

  async function generate() {
    if (!pick) return;
    setGen(true);
    setMsg(null);
    try {
      const r = await apiSend<{ generated: number; matched: number; strategy: string }>(
        `/api/prospect/intel/leads/${pick}/opportunities`, "POST",
      );
      setMsg(r.generated > 0
        ? `✅ ${r.generated} oportunidades generadas (${r.matched} trends emparejados, ${r.strategy === "ai" ? "IA" : "fallback"}).`
        : "No se generaron oportunidades — revisa que haya trends detectados en el radar.");
      await load();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setGen(false);
    }
  }

  async function changeStatus(id: number, s: string) {
    await apiSend(`/api/prospect/intel/opportunities/${id}`, "PATCH", { status: s }).catch(() => {});
    await load();
  }

  const leadName = useMemo(() => leads.find((l) => String(l.id) === pick)?.name ?? "", [leads, pick]);
  const opps = data?.opportunities ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/prospect/intel" className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-soft)] transition-colors hover:bg-white/5 hover:text-white">Trend Radar</Link>
        <span className="rounded-lg bg-[var(--violet)]/20 px-3 py-1.5 text-sm text-white">Oportunidades</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Oportunidades de contenido</h1>
          <p className="text-sm text-[var(--ink-mute)]">Ideas de video específicas por negocio, derivadas de trends reales con evidencia.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            Negocio
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="w-64 cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
              <option value="" className="bg-[#111]">Elegir lead…</option>
              {leads.map((l) => <option key={l.id} value={l.id} className="bg-[#111]">{l.name}{l.category ? ` · ${l.category}` : ""}</option>)}
            </select>
          </label>
          <button onClick={generate} disabled={!pick || gen}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--violet)] to-[var(--peri)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_rgba(119,82,254,.7)] transition-all hover:brightness-110 disabled:opacity-60">
            {gen ? <><Spinner size={14} /> Generando…</> : <>{Icons.bolt(15)} Generar</>}
          </button>
        </div>
      </div>

      {gen && <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-200">Ejecutando business_match → creative_director para <strong>{leadName}</strong>… (2 llamadas a claude -p, ~2-3 min)</div>}
      {msg && <div className="rounded-xl border border-[var(--peri)]/30 bg-[var(--peri)]/[0.06] px-4 py-2.5 text-sm text-[var(--ink-soft)]">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        <Chip active={!status} onClick={() => setStatus("")}>Todas</Chip>
        {(data?.byStatus ?? []).map((s) => (
          <Chip key={s.status} active={status === s.status} onClick={() => setStatus(s.status)}>
            {STATUS_LABEL[s.status] ?? s.status} <span className="text-[var(--ink-mute)]">{s.n}</span>
          </Chip>
        ))}
      </div>

      {loading && opps.length === 0 && <div className="pa-card p-10 text-center text-sm text-[var(--ink-mute)]">Cargando…</div>}
      {!loading && opps.length === 0 && (
        <div className="pa-card p-10 text-center">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-[var(--peri)]">{Icons.bolt(22)}</div>
          <p className="text-sm text-[var(--ink-soft)]">Aún no hay oportunidades. Elige un lead y pulsa <strong className="text-white">Generar</strong>.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {opps.map((o) => <OpportunityCard key={o.id} o={o} onStatus={changeStatus} />)}
      </div>
    </div>
  );
}

function OpportunityCard({ o, onStatus }: { o: Opportunity; onStatus: (id: number, s: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pa-card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--ink-mute)]">
            <span className="font-medium text-[var(--ink-soft)]">{o.businessName}</span>
            {o.platform && <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]">{PLATFORM_LABEL[o.platform] ?? o.platform}</span>}
            {o.durationSeconds != null && <span>· {o.durationSeconds}s</span>}
            {o.difficulty && <span>· dif. {o.difficulty}</span>}
          </div>
          <h3 className="mt-1 text-[0.98rem] font-semibold leading-snug text-white">{o.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[var(--ink-soft)]">{STATUS_LABEL[o.status] ?? o.status}</span>
      </div>

      {/* Score row */}
      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1.5 sm:grid-cols-4">
        <Meter label="Fit" value={o.businessFit} tone="good" />
        <Meter label="Viralidad" value={o.viralityScore} tone="hot" />
        <Meter label="Confianza" value={o.trendConfidence} tone="cool" />
        <Meter label="Competencia" value={o.competitionScore} tone="warn" />
      </div>

      {o.hook && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">Hook</div>
          <p className="mt-0.5 text-sm text-white">{o.hook}</p>
          {o.first3s && <p className="mt-1.5 text-xs text-[var(--ink-soft)]"><span className="text-[var(--ink-mute)]">Primeros 3s:</span> {o.first3s}</p>}
        </div>
      )}

      {(o.keywords?.length || o.hashtags?.length) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(o.hashtags ?? []).slice(0, 6).map((h) => <span key={h} className="rounded bg-[var(--violet)]/12 px-1.5 py-0.5 text-[10px] text-[var(--peri)]">{h}</span>)}
          {(o.keywords ?? []).slice(0, 5).map((k) => <span key={k} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-[var(--ink-mute)]">{k}</span>)}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3 text-sm">
          {o.script && o.script.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">Guion</div>
              <ol className="space-y-1">
                {o.script.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[var(--ink-soft)]">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-white/5 text-[9px] text-[var(--peri)]">{i + 1}</span>
                    <span>{s.beat}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {o.cta && <p className="text-[var(--ink-soft)]"><span className="text-[var(--ink-mute)]">CTA:</span> {o.cta}</p>}
          {o.thumbnailConcept && <p className="text-[var(--ink-soft)]"><span className="text-[var(--ink-mute)]">Miniatura:</span> {o.thumbnailConcept}</p>}
          {o.editing?.length ? <p className="text-[var(--ink-soft)]"><span className="text-[var(--ink-mute)]">Edición:</span> {o.editing.join(" · ")}</p> : null}
          {o.repurposing?.length ? <p className="text-[var(--ink-soft)]"><span className="text-[var(--ink-mute)]">Reutilización:</span> {o.repurposing.join(" · ")}</p> : null}
          <p className="text-[var(--ink-mute)]">Publicar: {o.postingTime ?? "—"} · {o.frequency ?? "—"}</p>
          {o.reasoning && <p className="rounded-lg bg-white/[0.02] p-2 text-xs italic text-[var(--ink-soft)]">{o.reasoning}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <button onClick={() => setOpen((v) => !v)} className="cursor-pointer text-xs text-[var(--peri)] hover:underline">{open ? "Ocultar guion" : "Ver guion completo"}</button>
        {o.trendId && <Link href={`/prospect/intel/trends/${o.trendId}`} className="text-xs text-[var(--ink-mute)] hover:text-white" title={o.trendTitle ?? undefined}>· evidencia →</Link>}
        <div className="ml-auto flex gap-1.5">
          {o.status !== "aprobada" && <button onClick={() => onStatus(o.id, "aprobada")} className="cursor-pointer rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20">Aprobar</button>}
          {o.status !== "descartada" && <button onClick={() => onStatus(o.id, "descartada")} className="cursor-pointer rounded-md border border-white/12 px-2 py-1 text-[11px] text-[var(--ink-soft)] hover:bg-white/5">Descartar</button>}
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number | null; tone: "hot" | "good" | "cool" | "warn" }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color = tone === "hot" ? "#fb7185" : tone === "good" ? "#34d399" : tone === "warn" ? "#fbbf24" : "#38bdf8";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ink-mute)]">{label}</span>
        <span className="font-mono tabular-nums" style={{ color }}>{value ?? "—"}</span>
      </div>
      <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </span>
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
