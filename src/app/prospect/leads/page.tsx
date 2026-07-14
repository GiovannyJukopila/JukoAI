"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { apiGet, LEAD_STATUS_OPTIONS, type LeadRow, type Category, type CoverageRow } from "../_lib";
import { StatCard, ScoreBadge, Icons } from "../_components/viz";
import { Analytics, type AnalyticsScope } from "../_components/Analytics";
import { useLang, type Messages } from "../_i18n";
import { ENABLE_BUSINESS_AUDIT } from "@/config/features";

type CityFacet = { id: number; name: string; country: string };
type LeadsResponse = {
  leads: (LeadRow & { issues?: string[] })[];
  facets: { categories: string[] };
};
/** Full geographic catalog (every planned zone, not just those with leads). */
type CatalogZone = { id: number; country: string; cityId: number; city: string | null; name: string };
type SortKey = "score" | "name" | "reviews" | "rating";

export default function LeadsPage() {
  const router = useRouter();
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [zonesCatalog, setZonesCatalog] = useState<CatalogZone[]>([]);
  const [loading, setLoading] = useState(true);

  // Geographic scope is shared with the analytics panel (drill-down ⇄ table).
  const [country, setCountry] = useState("");
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [category, setCategory] = useState("");
  const [minScore, setMinScore] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [onlyUnaudited, setOnlyUnaudited] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");

  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (cityId) params.set("cityId", cityId);
    if (zoneId) params.set("zoneId", zoneId);
    if (category) params.set("category", category);
    if (minScore) params.set("minScore", minScore);
    if (leadStatus) params.set("leadStatus", leadStatus);
    if (onlyUnaudited) params.set("unaudited", "1");
    if (q) params.set("q", q);
    try {
      // Keep previous rows on screen while the new page loads (no table wipe).
      setData(await apiGet<LeadsResponse>(`/api/prospect/leads?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }, [country, cityId, zoneId, category, minScore, leadStatus, onlyUnaudited, q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiGet<{ categories: Category[] }>("/api/prospect/categories").then((d) => setCategories(d.categories)).catch(() => {});
    apiGet<{ zones: CatalogZone[] }>("/api/prospect/zones").then((d) => setZonesCatalog(d.zones)).catch(() => {});
  }, []);

  // Geographic dropdowns are fed by the full zone catalog (every planned barrio),
  // not only zones that already have leads — so a fresh city shows all its zones.
  const facetCountries = useMemo(() => [...new Set(zonesCatalog.map((z) => z.country))].sort(), [zonesCatalog]);
  const facetCities = useMemo(() => {
    const seen = new Map<number, CityFacet>();
    for (const z of zonesCatalog) {
      if (country && z.country !== country) continue;
      if (!seen.has(z.cityId)) seen.set(z.cityId, { id: z.cityId, name: z.city ?? "—", country: z.country });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [zonesCatalog, country]);
  const facetZones = useMemo(
    () => zonesCatalog
      .filter((z) => (cityId ? z.cityId === Number(cityId) : !country || z.country === country))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [zonesCatalog, country, cityId],
  );
  const scope: AnalyticsScope = useMemo(() => ({ country, cityId, zoneId }), [country, cityId, zoneId]);
  const onScopeChange = useCallback((sc: AnalyticsScope) => { setCountry(sc.country); setCityId(sc.cityId); setZoneId(sc.zoneId); }, []);
  const catLabel = (id: string | null) => (id ? t.categories[id] : null) ?? categories.find((c) => c.id === id)?.label ?? id ?? "—";

  const stats = useMemo(() => {
    const leads = data?.leads ?? [];
    const audited = leads.filter((l) => l.auditStatus !== "none");
    const scores = audited.map((l) => l.opportunityScore ?? 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const hot = leads.filter((l) => (l.opportunityScore ?? -1) >= 70).length;
    return { total: leads.length, audited: audited.length, avg, hot, unaudited: leads.length - audited.length };
  }, [data]);

  // Client-side ordering — the API always returns score-desc; re-sorting locally
  // keeps the interaction instant (no refetch, animated reflow).
  const rows = useMemo(() => {
    const leads = [...(data?.leads ?? [])];
    const cmp: Record<SortKey, (a: LeadRow, b: LeadRow) => number> = {
      score: (a, b) => (b.opportunityScore ?? -1) - (a.opportunityScore ?? -1) || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      reviews: (a, b) => (b.reviewsCount ?? -1) - (a.reviewsCount ?? -1),
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
    };
    return leads.sort(cmp[sortKey]);
  }, [data, sortKey]);

  const hasActiveFilters = !!(country || cityId || zoneId || category || minScore || leadStatus || onlyUnaudited || search);
  const clearFilters = () => {
    setCountry(""); setCityId(""); setZoneId(""); setCategory("");
    setMinScore(""); setLeadStatus(""); setOnlyUnaudited(false); setSearch("");
  };

  // A zone card in the coverage panel drives the table filters (drill-down).
  const pickZone = useCallback((z: CatalogZone) => {
    setCountry(z.country);
    setCityId(String(z.cityId));
    setZoneId((prev) => (prev === String(z.id) ? "" : String(z.id)));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.leads.title}</h1>
        <p className="text-sm text-[var(--ink-mute)]">{t.leads.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.leads.kLeads} value={stats.total} sub={t.leads.kAudited(stats.audited)} />
        <StatCard label={t.leads.kHot} value={stats.hot} accent="#fb7185" sub={t.leads.kHotSub} icon={Icons.bolt(16)} />
        <StatCard label={t.leads.kAvg} value={stats.avg ?? "—"} accent="#fbbf24" sub={t.leads.kAvgSub} />
        <StatCard label={t.leads.kUnaudited} value={stats.unaudited} sub={t.leads.kUnauditedSub} />
      </div>
      <Analytics variant="leads" scope={scope} onScopeChange={onScopeChange} />

      {/* Search by name */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-mute)]">{Icons.research(16)}</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.leads.search}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs text-[var(--ink-mute)] hover:text-white">✕</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <Filter label={t.leads.fCountry}>
          <select value={country} onChange={(e) => { setCountry(e.target.value); setCityId(""); setZoneId(""); }} className="filter-input">
            <option value="" className="bg-[#111]">{t.common.all_m}</option>
            {facetCountries.map((c) => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
          </select>
        </Filter>
        <Filter label={t.analytics.fCity}>
          <select value={cityId} onChange={(e) => { setCityId(e.target.value); setZoneId(""); }} className="filter-input" disabled={!country}>
            <option value="" className="bg-[#111]">{t.common.all_f}</option>
            {facetCities.map((c) => <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>)}
          </select>
        </Filter>
        <Filter label={t.leads.fZone}>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="filter-input" disabled={!country}>
            <option value="" className="bg-[#111]">{t.common.all_f}</option>
            {facetZones.map((z) => <option key={z.id} value={z.id} className="bg-[#111]">{z.name}</option>)}
          </select>
        </Filter>
        <Filter label={t.leads.fCategory}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="filter-input">
            <option value="" className="bg-[#111]">{t.common.all_f}</option>
            {data?.facets.categories.map((c) => <option key={c} value={c} className="bg-[#111]">{catLabel(c)}</option>)}
          </select>
        </Filter>
        <Filter label={t.leads.fMinScore}>
          <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} className="filter-input w-24" placeholder="0" />
        </Filter>
        <Filter label={t.leads.fStatus}>
          <select value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} className="filter-input">
            <option value="" className="bg-[#111]">{t.common.all_m}</option>
            {LEAD_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value} className="bg-[#111]">{t.leadStatus[s.value]}</option>)}
          </select>
        </Filter>
        <Filter label={t.leads.sort}>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="filter-input">
            <option value="score" className="bg-[#111]">{t.leads.sortScore}</option>
            <option value="name" className="bg-[#111]">{t.leads.sortName}</option>
            <option value="reviews" className="bg-[#111]">{t.leads.sortReviews}</option>
            <option value="rating" className="bg-[#111]">{t.leads.sortRating}</option>
          </select>
        </Filter>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            className="ml-auto cursor-pointer rounded-lg px-3 py-1.5 text-xs text-[var(--ink-soft)] hover:text-white">{t.leads.clear}</button>
        )}
      </div>

      {/* Quick filters — the "what's left to audit" view in one click */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOnlyUnaudited((v) => !v)}
          aria-pressed={onlyUnaudited}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            onlyUnaudited ? "border-rose-400/50 bg-rose-500/20 text-rose-100" : "border-rose-500/25 text-rose-300 hover:bg-rose-500/10"
          }`}
        >
          {t.leads.qUnaudited}
        </button>
        <button
          onClick={() => setMinScore(minScore === "70" ? "" : "70")}
          aria-pressed={minScore === "70"}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            minScore === "70" ? "border-amber-400/50 bg-amber-500/20 text-amber-100" : "border-amber-500/25 text-amber-300 hover:bg-amber-500/10"
          }`}
        >
          {t.leads.qHot}
        </button>
        <span className="ml-auto text-xs tabular-nums text-[var(--ink-mute)]" aria-live="polite">
          {loading ? t.common.loading : t.leads.results(rows.length)}
        </span>
      </div>

      {/* Zone coverage rollup (merged from the old Cobertura tab) */}
      <ZoneCoverage
        country={country}
        cityId={cityId ? Number(cityId) : null}
        activeZoneId={zoneId ? Number(zoneId) : null}
        zonesCatalog={zonesCatalog}
        categoriesTotal={categories.length}
        onPickZone={pickZone}
        t={t}
        reduceMotion={!!reduceMotion}
      />

      {/* Table — previous rows stay visible (dimmed) while a new filter loads */}
      <div className={`overflow-x-auto rounded-xl border border-white/10 transition-opacity duration-200 ${loading && data ? "opacity-60" : "opacity-100"}`}>
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-[var(--ink-mute)]">
            <tr>
              <th className="px-3 py-2.5">{t.leads.tScore}</th>
              <th className="px-3 py-2.5">{t.leads.tBusiness}</th>
              <th className="px-3 py-2.5">{t.leads.tCategory}</th>
              <th className="px-3 py-2.5">{t.leads.tZone}</th>
              <th className="px-3 py-2.5">{t.leads.tProblems}</th>
              <th className="px-3 py-2.5">{t.leads.tReviews}</th>
              <th className="px-3 py-2.5">{t.leads.tStatus}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!data && loading && <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--ink-mute)]">{t.common.loading}</td></tr>}
            {rows.length === 0 && data && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center">
                  <p className="text-sm text-[var(--ink-mute)]">{t.leads.empty}</p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters}
                      className="mt-3 cursor-pointer rounded-lg border border-[var(--peri)]/40 bg-[var(--peri)]/10 px-3 py-1.5 text-xs font-medium text-[var(--peri)] hover:bg-[var(--peri)]/20">
                      {t.leads.emptyCta}
                    </button>
                  )}
                </td>
              </tr>
            )}
            {rows.map((l, i) => (
              <motion.tr
                key={l.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut", delay: Math.min(i * 0.012, 0.25) }}
                onClick={() => router.push(`/prospect/leads/${l.id}`)}
                className="group cursor-pointer transition-colors hover:bg-white/[0.04]"
              >
                <td className="px-3 py-2.5"><ScoreBadge value={l.opportunityScore} /></td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-white group-hover:text-[var(--peri)]">{l.name}</div>
                  {l.website && <div className="max-w-[220px] truncate text-xs text-[var(--ink-mute)]">{l.website.replace(/^https?:\/\//, "")}</div>}
                </td>
                <td className="px-3 py-2.5 text-[var(--ink-soft)]">{catLabel(l.category)}</td>
                <td className="px-3 py-2.5 text-[var(--ink-soft)]">{l.zone ?? "—"}</td>
                <td className="px-3 py-2.5"><IssueChips issues={l.issues} auditStatus={l.auditStatus} t={t} /></td>
                <td className="px-3 py-2.5 text-[var(--ink-soft)]">
                  {l.rating ?? "—"} {l.reviewsCount != null && <span className="text-[var(--ink-mute)]">({l.reviewsCount})</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[var(--ink-soft)]">
                    {t.leadStatus[l.leadStatus] ?? l.leadStatus}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx global>{`
        .filter-input { border-radius:.5rem; border:1px solid rgba(255,255,255,.1); background:rgba(0,0,0,.3); padding:.375rem .5rem; font-size:.875rem; color:#fff; }
      `}</style>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">{label}{children}</label>;
}
function IssueChips({ issues, auditStatus, t }: { issues?: string[] | null; auditStatus: string; t: Messages }) {
  if (auditStatus === "none") return <span className="text-xs text-[var(--ink-mute)]">{t.leads.chipUnaudited}</span>;
  if (!issues || issues.length === 0) return <span className="text-xs text-emerald-300/70">{t.leads.chipOk}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {issues.slice(0, 3).map((i) => (
        <span key={i} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]">{t.issues[i] ?? i}</span>
      ))}
      {issues.length > 3 && <span className="text-[10px] text-[var(--ink-mute)]">+{issues.length - 3}</span>}
    </div>
  );
}

/* ── Zone coverage panel (merged from the deprecated Cobertura tab) ──────────
 * Read-only rollup per zone: how many categories were evaluated and how many
 * businesses are audited. Clicking a zone drives the table's geo filters. */

type ZoneAgg = { evaluated: number; overdue: number; bizTotal: number; bizAudited: number };

function ZoneCoverage({
  country, cityId, activeZoneId, zonesCatalog, categoriesTotal, onPickZone, t, reduceMotion,
}: {
  country: string;
  cityId: number | null;
  activeZoneId: number | null;
  zonesCatalog: CatalogZone[];
  categoriesTotal: number;
  onPickZone: (z: CatalogZone) => void;
  t: Messages;
  reduceMotion: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [cov, setCov] = useState<CoverageRow[] | null>(null);

  // Lazy-load the coverage ledger the first time the panel opens.
  useEffect(() => {
    if (!open || cov) return;
    apiGet<{ coverage: CoverageRow[] }>("/api/prospect/coverage").then((d) => setCov(d.coverage)).catch(() => setCov([]));
  }, [open, cov]);

  const aggByZone = useMemo(() => {
    const m = new Map<number, ZoneAgg>();
    for (const r of cov ?? []) {
      const agg = m.get(r.zoneId) ?? { evaluated: 0, overdue: 0, bizTotal: 0, bizAudited: 0 };
      agg.evaluated += 1;
      if (r.needsRefresh) agg.overdue += 1;
      agg.bizTotal += r.bizTotal;
      agg.bizAudited += r.bizAudited;
      m.set(r.zoneId, agg);
    }
    return m;
  }, [cov]);

  const zones = useMemo(
    () => zonesCatalog
      .filter((z) => z.country === country && (!cityId || z.cityId === cityId))
      .sort((a, b) => (aggByZone.get(b.id)?.bizTotal ?? 0) - (aggByZone.get(a.id)?.bizTotal ?? 0) || a.name.localeCompare(b.name)),
    [zonesCatalog, country, cityId, aggByZone],
  );

  if (!country) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-mute)]">{t.leads.covTitle}</span>
        <span className="text-xs text-[var(--ink-soft)]">· {country}{cityId ? "" : ""}</span>
        <span className="ml-auto text-xs text-[var(--peri)]">{open ? t.leads.covHide : t.leads.covShow}</span>
        <span className={`text-[var(--ink-mute)] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="cov-body"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="border-t border-white/5 p-3">
              {!ENABLE_BUSINESS_AUDIT && (
                <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-300/90">
                  {t.leads.covPaidNote}
                </p>
              )}
              {!cov && <p className="py-3 text-center text-xs text-[var(--ink-mute)]">{t.common.loading}</p>}
              {cov && zones.length === 0 && <p className="py-3 text-center text-xs text-[var(--ink-mute)]">{t.leads.covEmpty}</p>}
              {cov && zones.length > 0 && (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {zones.map((z, i) => {
                      const a = aggByZone.get(z.id);
                      const evaluated = a?.evaluated ?? 0;
                      const bizTotal = a?.bizTotal ?? 0;
                      const bizAudited = a?.bizAudited ?? 0;
                      const pct = bizTotal ? Math.round((bizAudited / bizTotal) * 100) : 0;
                      const active = activeZoneId === z.id;
                      return (
                        <motion.button
                          key={z.id}
                          layout={!reduceMotion}
                          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(i * 0.02, 0.3) }}
                          onClick={() => onPickZone(z)}
                          aria-pressed={active}
                          className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                            active ? "border-[var(--peri)]/50 bg-[var(--peri)]/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium text-white">{z.name}</span>
                            {a && a.overdue > 0 && (
                              <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">↻ {a.overdue}</span>
                            )}
                          </div>
                          {z.city && z.city !== z.name && <div className="truncate text-[11px] text-[var(--ink-mute)]">{z.city}</div>}
                          <div className="mt-2 flex items-center justify-between text-[11px]">
                            <span className="text-[var(--ink-soft)]">{t.leads.covEval(evaluated, categoriesTotal)}</span>
                            <span className={bizTotal && bizAudited >= bizTotal ? "text-emerald-300" : "text-[var(--ink-soft)]"}>
                              {t.leads.covAudit(bizAudited, bizTotal)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--ink-mute)]">{t.leads.covHint}</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
