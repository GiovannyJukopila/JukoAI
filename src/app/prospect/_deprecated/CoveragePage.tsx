/**
 * DEPRECATED (plan de refactor, Fase 2.2): el tab "Cobertura" se fusionó con
 * "Leads" en la vista unificada /prospect/leads. Este archivo se conserva como
 * referencia (lanzadores de scrape/audit por zona×categoría) y no es una ruta
 * — las carpetas con prefijo "_" no enrutan en el App Router.
 */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  apiGet,
  apiSend,
  fmtDate,
  type CoverageRow,
  type CountryProgress,
  type Category,
  type LeadRow,
} from "../_lib";
import { StatCard, ScoreBadge, Icons, Spinner } from "../_components/viz";
import { Analytics } from "../_components/Analytics";
import { useLang } from "../_i18n";
import { ENABLE_BUSINESS_AUDIT } from "@/config/features";

type CoverageResponse = { coverage: CoverageRow[]; progress: CountryProgress[] };
type ZoneCat = { country: string; zone: string; zoneId: number; category: string; city?: string | null };
type CatStatus = "done" | "overdue" | "error" | "missing";
type Zone = { id: number; country: string; city: string | null; name: string };

const STATUS_DOT: Record<CatStatus, string> = {
  done: "bg-emerald-400",
  overdue: "bg-amber-400",
  error: "bg-rose-400",
  missing: "bg-white/20",
};

function statusOf(row?: CoverageRow): CatStatus {
  if (!row) return "missing";
  if (row.status === "error") return "error";
  if (row.needsRefresh) return "overdue";
  return "done";
}

export default function CoveragePage() {
  const { t } = useLang();
  const stLabel: Record<CatStatus, string> = {
    done: t.coverage.stDone, overdue: t.coverage.stOverdue, error: t.coverage.stError, missing: t.coverage.stMissing,
  };
  const catLabel = (id: string) => t.categories[id] ?? id;
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [fCountry, setFCountry] = useState("");
  const [fCity, setFCity] = useState("");
  const [fZoneId, setFZoneId] = useState("");
  // "Pending work" quick filter: show only zones with something left to do.
  const [pendingFilter, setPendingFilter] = useState<"" | "missing" | "overdue" | "toaudit">("");
  const [openZone, setOpenZone] = useState<number | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null); // `${zoneId}:${cat}`

  const [busy, setBusy] = useState<string | null>(null); // scrape: `${zoneId}:${cat}`
  const [auditingBiz, setAuditingBiz] = useState<number | null>(null);
  const [audit, setAudit] = useState<Record<string, { total: number; audited: number; running: boolean }>>({});
  const [biz, setBiz] = useState<Record<string, LeadRow[]>>({}); // businesses per `${zoneId}:${cat}`
  // Zone-level "evaluate all" / "audit all" job progress.
  const [zoneJob, setZoneJob] = useState<Record<number, { mode: "eval" | "audit"; done: number; total: number } | null>>({});
  // City-level job: runs the zone-level action over every zone of the selected city, one at a time.
  const [cityJob, setCityJob] = useState<{ mode: "eval" | "audit"; idx: number; total: number; zone: string; stopping: boolean } | null>(null);
  const cityStopRef = useRef(false); // stop is honored between zones, never mid-zone

  // `silent` reloads keep the list mounted (no scroll jump after an action).
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [cov, zs, cats] = await Promise.all([
        apiGet<CoverageResponse>("/api/prospect/coverage"),
        apiGet<{ zones: Zone[] }>("/api/prospect/zones"),
        apiGet<{ categories: Category[] }>("/api/prospect/categories"),
      ]);
      setData(cov);
      setZones(zs.zones);
      setCategories(cats.categories);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Audit progress now ships inside the coverage payload (bizTotal/bizAudited per
  // zone×category) — seed the audit map from it, keeping in-flight `running` flags.
  // This removed the old per-zone follow-up request (N+1) on every expand.
  useEffect(() => {
    if (!data) return;
    setAudit((prev) => {
      const n: typeof prev = { ...prev };
      for (const r of data.coverage) {
        const k = `${r.zoneId}:${r.category}`;
        n[k] = { total: r.bizTotal, audited: r.bizAudited, running: prev[k]?.running ?? false };
      }
      return n;
    });
  }, [data]);

  const covByKey = useMemo(() => {
    const m = new Map<string, CoverageRow>();
    for (const r of data?.coverage ?? []) m.set(`${r.zoneId}:${r.category}`, r);
    return m;
  }, [data]);

  const catalogCountries = useMemo(() => [...new Set(zones.map((z) => z.country))].sort(), [zones]);
  const catalogCities = useMemo(
    () => [...new Set(zones.filter((z) => z.country === fCountry && z.city).map((z) => z.city as string))].sort(),
    [zones, fCountry],
  );

  /** Per-zone rollup: evaluation status counts + real audit progress. */
  type ZoneAgg = { done: number; overdue: number; error: number; missing: number; bizTotal: number; bizAudited: number };
  const aggByZone = useMemo(() => {
    const m = new Map<number, ZoneAgg>();
    for (const z of zones) {
      const agg: ZoneAgg = { done: 0, overdue: 0, error: 0, missing: 0, bizTotal: 0, bizAudited: 0 };
      for (const c of categories) {
        const row = covByKey.get(`${z.id}:${c.id}`);
        agg[statusOf(row)]++;
        if (row) { agg.bizTotal += row.bizTotal; agg.bizAudited += row.bizAudited; }
      }
      m.set(z.id, agg);
    }
    return m;
  }, [zones, categories, covByKey]);

  const hasPending = useCallback((agg: ZoneAgg | undefined, kind: "" | "missing" | "overdue" | "toaudit") => {
    if (!agg || !kind) return true;
    if (kind === "missing") return agg.missing > 0;
    if (kind === "overdue") return agg.overdue > 0;
    return agg.bizTotal - agg.bizAudited > 0;
  }, []);

  // Every zone of the selected city, regardless of the zone filter — city actions
  // always cover the whole city.
  const cityZones = useMemo(
    () => zones.filter((z) => z.country === fCountry && z.city === fCity).sort((a, b) => a.name.localeCompare(b.name)),
    [zones, fCountry, fCity],
  );

  const cityToAudit = useMemo(() => {
    let n = 0;
    for (const z of cityZones) {
      const a = aggByZone.get(z.id);
      if (a) n += a.bizTotal - a.bizAudited;
    }
    return n;
  }, [cityZones, aggByZone]);

  const countryZones = useMemo(() => {
    let list = zones.filter((z) => z.country === fCountry);
    if (fCity) list = list.filter((z) => z.city === fCity);
    if (fZoneId) list = list.filter((z) => z.id === Number(fZoneId));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [zones, fCountry, fCity, fZoneId]);

  const visibleZones = useMemo(
    () => countryZones.filter((z) => hasPending(aggByZone.get(z.id), pendingFilter)),
    [countryZones, aggByZone, pendingFilter, hasPending],
  );

  /** Pending-work totals for the selected country (drive the chips). */
  const pending = useMemo(() => {
    let missing = 0, overdue = 0, toAudit = 0;
    for (const z of countryZones) {
      const a = aggByZone.get(z.id);
      if (!a) continue;
      missing += a.missing;
      overdue += a.overdue;
      toAudit += a.bizTotal - a.bizAudited;
    }
    return { missing, overdue, toAudit };
  }, [countryZones, aggByZone]);

  const stats = useMemo(() => {
    const cov = data?.coverage ?? [];
    return {
      businesses: cov.reduce((a, c) => a + c.resultsCount, 0),
      done: cov.filter((c) => !c.needsRefresh && c.status !== "error").length,
      overdue: cov.filter((c) => c.needsRefresh).length,
      toAudit: cov.reduce((a, c) => a + (c.bizTotal - c.bizAudited), 0),
    };
  }, [data]);

  async function runAudit(zoneId: number, category: string) {
    const k = `${zoneId}:${category}`;
    setAudit((p) => ({ ...p, [k]: { total: p[k]?.total ?? 0, audited: p[k]?.audited ?? 0, running: true } }));
    try {
      for (;;) {
        const r = await apiSend<{ total: number; audited: number; remaining: number }>(
          "/api/prospect/audit-batch", "POST", { zoneId, category, limit: 3 },
        );
        const more = r.remaining > 0;
        setAudit((p) => ({ ...p, [k]: { total: r.total, audited: r.audited, running: more } }));
        if (openCat === k) loadBusinesses(zoneId, category); // refresh open business list
        if (!more) break;
      }
    } catch {
      setAudit((p) => ({ ...p, [k]: { ...(p[k] ?? { total: 0, audited: 0 }), running: false } }));
    }
  }

  async function scrape(zc: ZoneCat, force: boolean) {
    setBusy(`${zc.zoneId}:${zc.category}`);
    try {
      await apiSend("/api/prospect/scrape", "POST", { country: zc.country, zone: zc.zone, city: zc.city, category: zc.category, force });
      await load(true); // silent reload (brings fresh audit progress too) — no scroll jump
    } finally {
      setBusy(null);
    }
    // Note: scraping no longer auto-audits. Audit only on the "Auditar" buttons.
  }

  async function loadBusinesses(zoneId: number, category: string) {
    const k = `${zoneId}:${category}`;
    try {
      const d = await apiGet<{ leads: LeadRow[] }>(`/api/prospect/leads?zoneId=${zoneId}&category=${category}&limit=300`);
      setBiz((p) => ({ ...p, [k]: d.leads }));
    } catch { /* ignore */ }
  }

  async function toggleBusinesses(zoneId: number, category: string) {
    const k = `${zoneId}:${category}`;
    if (openCat === k) { setOpenCat(null); return; }
    setOpenCat(k);
    if (!biz[k]) await loadBusinesses(zoneId, category);
  }

  async function auditOne(bizId: number, zoneId: number, category: string) {
    setAuditingBiz(bizId);
    try {
      await apiSend(`/api/prospect/leads/${bizId}/audit`, "POST");
      await loadBusinesses(zoneId, category);
      // refresh the category audit progress
      setAudit((p) => {
        const k = `${zoneId}:${category}`;
        const cur = p[k] ?? { total: 0, audited: 0, running: false };
        return { ...p, [k]: { ...cur, audited: Math.min(cur.total, cur.audited + 1) } };
      });
    } finally {
      setAuditingBiz(null);
    }
  }

  // Evaluate every category of a zone (force=false → skips fresh, fills missing).
  async function evaluateAllZone(z: Zone) {
    setZoneJob((p) => ({ ...p, [z.id]: { mode: "eval", done: 0, total: categories.length } }));
    for (let i = 0; i < categories.length; i++) {
      setZoneJob((p) => ({ ...p, [z.id]: { mode: "eval", done: i, total: categories.length } }));
      await scrape({ country: z.country, zone: z.name, city: z.city, zoneId: z.id, category: categories[i].id }, false);
    }
    setZoneJob((p) => ({ ...p, [z.id]: null }));
  }

  // Audit every category of a zone (only unlocks once all are evaluated).
  async function auditAllZone(z: Zone) {
    setZoneJob((p) => ({ ...p, [z.id]: { mode: "audit", done: 0, total: categories.length } }));
    for (let i = 0; i < categories.length; i++) {
      setZoneJob((p) => ({ ...p, [z.id]: { mode: "audit", done: i, total: categories.length } }));
      await runAudit(z.id, categories[i].id);
    }
    setZoneJob((p) => ({ ...p, [z.id]: null }));
  }

  // Run the zone-level action over every zone of the city, sequentially (keeps
  // Google Places / PageSpeed usage throttled). Audit mode skips unevaluated
  // categories on its own: audit-batch returns remaining=0 when there's nothing.
  async function runCity(mode: "eval" | "audit") {
    cityStopRef.current = false;
    const list = cityZones;
    for (let i = 0; i < list.length; i++) {
      if (cityStopRef.current) break;
      const z = list[i];
      setCityJob({ mode, idx: i + 1, total: list.length, zone: z.name, stopping: false });
      if (mode === "eval") await evaluateAllZone(z);
      else await auditAllZone(z);
    }
    setCityJob(null);
  }

  function stopCity() {
    cityStopRef.current = true;
    setCityJob((p) => (p ? { ...p, stopping: true } : p));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.coverage.title}</h1>
        <p className="text-sm text-[var(--ink-mute)]">{t.coverage.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.coverage.kBusinesses} value={stats.businesses} icon={Icons.research(16)} />
        <StatCard label={t.coverage.kDone} value={stats.done} accent="#34d399" />
        <StatCard label={t.coverage.kOverdue} value={stats.overdue} accent={stats.overdue ? "#fbbf24" : undefined} />
        <StatCard label={t.coverage.kToAudit} value={stats.toAudit} accent={stats.toAudit ? "#fb7185" : "#34d399"} sub={t.coverage.kToAuditSub} icon={Icons.seo(16)} />
      </div>

      <Analytics variant="coverage" />

      {/* Filtro País / Zona */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
          {t.coverage.fCountry}
          <select value={fCountry} onChange={(e) => { setFCountry(e.target.value); setFCity(""); setFZoneId(""); setOpenZone(null); setPendingFilter(""); }}
            className="w-48 cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
            <option value="" className="bg-[#111]">{t.coverage.fCountryAll}</option>
            {catalogCountries.map((c) => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
          {t.coverage.fCity}
          <select value={fCity} disabled={!fCountry}
            onChange={(e) => { setFCity(e.target.value); setFZoneId(""); setOpenZone(null); }}
            className="w-48 cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white disabled:opacity-40">
            <option value="" className="bg-[#111]">{t.coverage.fCityAll}</option>
            {catalogCities.map((c) => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
          {t.coverage.fZone}
          <select value={fZoneId} disabled={!fCountry}
            onChange={(e) => { setFZoneId(e.target.value); setOpenZone(e.target.value ? Number(e.target.value) : null); }}
            className="w-52 cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white disabled:opacity-40">
            <option value="" className="bg-[#111]">{t.coverage.fZoneAll}</option>
            {zones.filter((z) => z.country === fCountry && (!fCity || z.city === fCity)).sort((a, b) => a.name.localeCompare(b.name)).map((z) => (
              <option key={z.id} value={z.id} className="bg-[#111]">{z.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Acciones de ciudad — evaluar todas las zonas / auditar todas las empresas */}
      {ENABLE_BUSINESS_AUDIT && !loading && fCountry && fCity && cityZones.length > 0 && (() => {
        const anyJob = !!cityJob || Object.values(zoneJob).some(Boolean);
        return (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-mute)]">{t.coverage.cityActions(fCity)}</span>
            <button onClick={() => runCity("eval")} disabled={anyJob}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--violet)]/40 bg-[var(--violet)]/15 px-3 py-1.5 text-sm font-medium text-[var(--peri)] transition-colors hover:bg-[var(--violet)]/25 disabled:cursor-not-allowed disabled:opacity-50">
              {cityJob?.mode === "eval"
                ? <><Spinner size={13} /> {t.coverage.cityEvaluatingZone(cityJob.idx, cityJob.total, cityJob.zone)}</>
                : t.coverage.cityEvalAll(cityZones.length)}
            </button>
            <button onClick={() => runCity("audit")} disabled={anyJob || cityToAudit === 0}
              title={cityToAudit === 0 ? t.coverage.cityNothingToAudit : t.coverage.cityAuditHint}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              {cityJob?.mode === "audit"
                ? <><Spinner size={13} /> {t.coverage.cityAuditingZone(cityJob.idx, cityJob.total, cityJob.zone)}</>
                : t.coverage.cityAuditAll(cityToAudit)}
            </button>
            {cityJob && (
              <button onClick={stopCity} disabled={cityJob.stopping}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-60">
                {cityJob.stopping ? t.coverage.bulkStopping : t.coverage.bulkStop}
              </button>
            )}
            {!cityJob && <span className="text-[11px] text-[var(--ink-mute)]">{t.coverage.cityAuditHint}</span>}
          </div>
        );
      })()}

      {/* Trabajo pendiente — chips accionables que filtran las zonas + leyenda compacta */}
      {!loading && fCountry && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-mute)]">{t.coverage.pendingTitle}</span>
          <PendingChip active={pendingFilter === ""} onClick={() => setPendingFilter("")}>{t.coverage.chipAll}</PendingChip>
          <PendingChip active={pendingFilter === "missing"} tone="violet" disabled={pending.missing === 0} onClick={() => setPendingFilter(pendingFilter === "missing" ? "" : "missing")}>
            {t.coverage.chipMissing(pending.missing)}
          </PendingChip>
          <PendingChip active={pendingFilter === "overdue"} tone="amber" disabled={pending.overdue === 0} onClick={() => setPendingFilter(pendingFilter === "overdue" ? "" : "overdue")}>
            {t.coverage.chipOverdueF(pending.overdue)}
          </PendingChip>
          <PendingChip active={pendingFilter === "toaudit"} tone="rose" disabled={pending.toAudit === 0} onClick={() => setPendingFilter(pendingFilter === "toaudit" ? "" : "toaudit")}>
            {t.coverage.chipToAudit(pending.toAudit)}
          </PendingChip>
          <span className="ml-auto flex flex-wrap gap-3 text-[11px] text-[var(--ink-soft)]">
            {(["done", "overdue", "missing", "error"] as CatStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />{stLabel[s]}</span>
            ))}
          </span>
        </div>
      )}

      {loading && <p className="text-sm text-[var(--ink-mute)]">{t.common.loading}</p>}

      {!loading && !fCountry && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-[var(--peri)]">{Icons.research(20)}</div>
          <p className="text-sm text-[var(--ink-soft)]">{t.coverage.pickCountry}</p>
        </div>
      )}

      {!loading && fCountry && pendingFilter && visibleZones.length === 0 && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-8 text-center text-sm text-emerald-200">
          {t.coverage.allClear}
        </div>
      )}

      {/* Zonas del país filtrado */}
      {!loading && fCountry && visibleZones.map((z) => {
        const total = categories.length;
        const counts = aggByZone.get(z.id) ?? { done: 0, overdue: 0, error: 0, missing: 0, bizTotal: 0, bizAudited: 0 };
        const isOpen = openZone === z.id;
        const allEvaluated = categories.length > 0 && counts.missing === 0;
        const auditPct = counts.bizTotal ? Math.round((counts.bizAudited / counts.bizTotal) * 100) : 0;
        const job = zoneJob[z.id];
        return (
          <div key={z.id} className="overflow-hidden rounded-2xl border border-white/10">
            <button onClick={() => setOpenZone(isOpen ? null : z.id)}
              className="flex w-full cursor-pointer items-center gap-3 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.05]">
              <span className="min-w-[150px] font-medium text-white">{z.name}{z.city && z.city !== z.name ? <span className="text-[var(--ink-mute)]"> · {z.city}</span> : ""}</span>
              <span className="hidden flex-1 flex-wrap gap-1 sm:flex">
                {categories.map((c) => {
                  const st = statusOf(covByKey.get(`${z.id}:${c.id}`));
                  return <span key={c.id} title={`${catLabel(c.id)}: ${stLabel[st]}`} className={`h-2 w-2 rounded-full ${STATUS_DOT[st]}`} />;
                })}
              </span>
              {/* Progreso visible sin expandir: evaluación + auditoría */}
              <span className="flex shrink-0 items-center gap-1.5" title={`${t.coverage.hdrEval}: ${counts.done}/${total}`}>
                <span className="text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">{t.coverage.hdrEval}</span>
                <span className={`font-mono text-xs tabular-nums ${counts.missing > 0 ? "text-[var(--peri)]" : "text-[var(--ink-soft)]"}`}>{counts.done}/{total}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5" title={`${t.coverage.hdrAudit}: ${counts.bizAudited}/${counts.bizTotal}`}>
                <span className="text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">{t.coverage.hdrAudit}</span>
                <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-white/10 md:inline-block">
                  <span className="block h-full rounded-full bg-emerald-400" style={{ width: `${auditPct}%` }} />
                </span>
                <span className={`font-mono text-xs tabular-nums ${counts.bizTotal - counts.bizAudited > 0 ? "text-rose-300" : "text-emerald-300"}`}>
                  {counts.bizAudited}/{counts.bizTotal}
                </span>
              </span>
              {counts.overdue > 0 && <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">{t.coverage.overdueShort(counts.overdue)}</span>}
              <span className={`text-[var(--ink-mute)] transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
            </button>

            {isOpen && (
              <div className="bg-black/20 p-3">
                {/* Acciones generales de la zona */}
                {ENABLE_BUSINESS_AUDIT && <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => evaluateAllZone(z)} disabled={!!job || !!cityJob}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--violet)]/40 bg-[var(--violet)]/15 px-3 py-1.5 text-sm font-medium text-[var(--peri)] transition-colors hover:bg-[var(--violet)]/25 disabled:opacity-60">
                    {job?.mode === "eval" ? <><Spinner size={13} /> {t.coverage.evaluatingN(job.done, job.total)}</> : <>{t.coverage.evalAll}</>}
                  </button>
                  <button onClick={() => auditAllZone(z)} disabled={!allEvaluated || !!job || !!cityJob}
                    title={!allEvaluated ? t.coverage.unlock : t.coverage.auditAll}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40">
                    {job?.mode === "audit" ? <><Spinner size={13} /> {t.coverage.auditingN(job.done, job.total)}</> : <>{t.coverage.auditAll}</>}
                  </button>
                  {!allEvaluated && <span className="text-[11px] text-[var(--ink-mute)]">{t.coverage.unlock}</span>}
                </div>}

                {/* Grid de categorías */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((c) => {
                    const row = covByKey.get(`${z.id}:${c.id}`);
                    const st = statusOf(row);
                    const k = `${z.id}:${c.id}`;
                    const isBusy = busy === k;
                    const a = audit[k];
                    const aTotal = a?.total ?? 0, aDone = a?.audited ?? 0;
                    const aPct = aTotal ? Math.round((aDone / aTotal) * 100) : 0;
                    const aComplete = aTotal > 0 && aDone >= aTotal;
                    const hasBiz = !!row && row.resultsCount > 0;
                    const catOpen = openCat === k;
                    return (
                      <div key={c.id} className={`flex flex-col rounded-xl border p-3 transition-colors ${catOpen ? "border-[var(--peri)]/50 bg-[var(--peri)]/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[st]}`} />
                            <span className="truncate text-sm text-white">{catLabel(c.id)}</span>
                          </div>
                          {ENABLE_BUSINESS_AUDIT && <button onClick={() => scrape({ country: z.country, zone: z.name, city: z.city, zoneId: z.id, category: c.id }, st !== "missing")} disabled={isBusy}
                            className={`inline-flex min-w-[68px] shrink-0 items-center justify-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-60 ${
                              st === "missing" ? "border-[var(--violet)]/40 bg-[var(--violet)]/15 text-[var(--peri)] hover:bg-[var(--violet)]/25"
                                : st === "overdue" ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                                  : "border-white/15 text-[var(--ink-soft)] hover:bg-white/5"}`}>
                            {isBusy ? <Spinner size={13} /> : st === "missing" ? t.coverage.evaluar : t.coverage.refrescar}
                          </button>}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--ink-mute)]">{row ? t.coverage.businessesN(row.resultsCount, fmtDate(row.lastRunAt)) : t.coverage.notEvaluated}</div>

                        {hasBiz && (
                          <div className="mt-2 space-y-1.5">
                            {aTotal > 0 && (
                              <>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className={aComplete ? "text-emerald-300" : "text-[var(--ink-soft)]"}>
                                    {a?.running ? `${t.coverage.auditedN(aDone, aTotal)}…` : aComplete ? t.coverage.auditedDoneN(aDone, aTotal) : t.coverage.auditedN(aDone, aTotal)}
                                  </span>
                                  {ENABLE_BUSINESS_AUDIT && !aComplete && (
                                    <button onClick={() => runAudit(z.id, c.id)} disabled={a?.running}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60">
                                      {a?.running ? <><Spinner size={10} /> {t.coverage.auditAll}</> : t.coverage.auditAll}
                                    </button>
                                  )}
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${aPct}%` }} />
                                </div>
                              </>
                            )}
                            <button onClick={() => toggleBusinesses(z.id, c.id)}
                              className={`w-full cursor-pointer rounded-md border px-2 py-1 text-[11px] transition-colors ${catOpen ? "border-[var(--peri)]/50 bg-[var(--peri)]/15 text-[var(--peri)]" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5"}`}>
                              {catOpen ? t.coverage.hideBiz : t.coverage.viewBiz(row!.resultsCount)}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Panel de negocios (a lo ancho) de la categoría seleccionada en esta zona */}
                {openCat && openCat.startsWith(`${z.id}:`) && (() => {
                  const cat = openCat.slice(`${z.id}:`.length);
                  const list = biz[openCat];
                  return (
                    <div className="mt-3 rounded-2xl border border-[var(--peri)]/30 bg-[var(--peri)]/[0.04] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-white">
                          {t.coverage.panelIn(catLabel(cat), z.name)}
                          <span className="text-[var(--ink-mute)]"> · {list ? t.coverage.countN(list.length) : "…"}</span>
                        </span>
                        <button onClick={() => setOpenCat(null)} className="cursor-pointer text-xs text-[var(--ink-soft)] hover:text-white">{t.common.close} ✕</button>
                      </div>
                      {!list && <p className="py-4 text-center text-xs text-[var(--ink-mute)]">{t.coverage.loadingBiz}</p>}
                      {list && list.length === 0 && <p className="py-4 text-center text-xs text-[var(--ink-mute)]">{t.coverage.noBiz}</p>}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {list?.map((b) => (
                          <div key={b.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <Link href={`/prospect/leads/${b.id}`} className="line-clamp-2 text-sm font-medium text-white hover:text-[var(--peri)]">{b.name}</Link>
                              <ScoreBadge value={b.opportunityScore} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-mute)]">
                              <span className={`h-1.5 w-1.5 rounded-full ${b.auditStatus === "none" ? "bg-white/25" : b.auditStatus === "error" ? "bg-rose-400" : "bg-emerald-400"}`} />
                              {b.auditStatus === "none" ? t.coverage.bizUnaudited : t.coverage.bizAudited}
                              {b.website && <span className="truncate">· {b.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>}
                            </div>
                            <div className="mt-auto flex gap-2">
                              <Link href={`/prospect/leads/${b.id}`} className="flex-1 cursor-pointer rounded-md border border-white/15 px-2 py-1 text-center text-[11px] text-white hover:bg-white/5">{t.coverage.viewCard}</Link>
                              {ENABLE_BUSINESS_AUDIT && <button onClick={() => auditOne(b.id, z.id, cat)} disabled={auditingBiz === b.id}
                                className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-[var(--ink-soft)] hover:bg-white/5 disabled:opacity-60">
                                {auditingBiz === b.id ? <Spinner size={11} /> : t.coverage.audit}
                              </button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Actionable filter chip for the pending-work bar. */
function PendingChip({
  active, disabled, tone = "neutral", onClick, children,
}: {
  active: boolean;
  disabled?: boolean;
  tone?: "neutral" | "violet" | "amber" | "rose";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: active ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5",
    violet: active ? "border-[var(--peri)]/50 bg-[var(--violet)]/25 text-white" : "border-[var(--peri)]/25 text-[var(--peri)] hover:bg-[var(--violet)]/15",
    amber: active ? "border-amber-400/50 bg-amber-500/20 text-amber-100" : "border-amber-500/25 text-amber-300 hover:bg-amber-500/10",
    rose: active ? "border-rose-400/50 bg-rose-500/20 text-rose-100" : "border-rose-500/25 text-rose-300 hover:bg-rose-500/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-35 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
