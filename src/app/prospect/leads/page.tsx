"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, LEAD_STATUS_OPTIONS, type LeadRow, type Category } from "../_lib";
import { StatCard, ScoreBadge, Icons } from "../_components/viz";
import { Analytics, type AnalyticsScope } from "../_components/Analytics";
import { useLang, type Messages } from "../_i18n";

type CityFacet = { id: number; name: string; country: string };
type LeadsResponse = {
  leads: (LeadRow & { issues?: string[] })[];
  facets: { categories: string[] };
};
/** Full geographic catalog (every planned zone, not just those with leads). */
type CatalogZone = { id: number; country: string; cityId: number; city: string | null; name: string };

export default function LeadsPage() {
  const router = useRouter();
  const { t } = useLang();
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
        {(country || cityId || zoneId || category || minScore || leadStatus || onlyUnaudited || search) && (
          <button onClick={() => { setCountry(""); setCityId(""); setZoneId(""); setCategory(""); setMinScore(""); setLeadStatus(""); setOnlyUnaudited(false); setSearch(""); }}
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
          {loading ? t.common.loading : t.leads.results(data?.leads.length ?? 0)}
        </span>
      </div>

      {/* Table — previous rows stay visible (dimmed) while a new filter loads */}
      <div className={`overflow-hidden rounded-xl border border-white/10 transition-opacity duration-200 ${loading && data ? "opacity-60" : "opacity-100"}`}>
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
            {data?.leads.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--ink-mute)]">{t.leads.empty}</td></tr>
            )}
            {data?.leads.map((l) => (
              <tr key={l.id} onClick={() => router.push(`/prospect/leads/${l.id}`)} className="group cursor-pointer transition-colors hover:bg-white/[0.04]">
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
              </tr>
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
