"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { apiGet } from "../_lib";
import { ChartCard, HBar, VBars, Donut, StackedHBar, PALETTE } from "./charts";
import { StatCard } from "./viz";
import { useLang } from "../_i18n";

type Analytics = {
  scope: { country: string | null; cityId: number | null; zoneId: number | null };
  total: number;
  audited: number;
  kpis: { total: number; audited: number; hot: number; avgScore: number; sectors: number; zones: number; cities: number };
  byCountry: { country: string; total: number; audited: number; avgScore: number; hot: number }[];
  byCity: { cityId: number; city: string; total: number; avgScore: number }[];
  byCategory: { category: string; total: number; avgScore: number }[];
  scoreBuckets: { hot: number; warm: number; cool: number; cold: number; unaudited: number };
  topZones: { zoneId: number; cityId: number; zone: string; country: string; total: number; avgScore: number }[];
  topIssues: { issue: string; n: number }[];
  countryProgress: { country: string; planned: number; covered: number }[];
};

/** Scope shared with the parent (leads page) so the table can react to drill-down. */
export type AnalyticsScope = { country: string; cityId: string; zoneId: string };
export const EMPTY_SCOPE: AnalyticsScope = { country: "", cityId: "", zoneId: "" };

const byIndex = (_v: number, i: number) => PALETTE[i % PALETTE.length];

const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardV = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } } };

export function Analytics({
  variant,
  scope: controlledScope,
  onScopeChange,
}: {
  variant: "leads" | "coverage";
  scope?: AnalyticsScope;
  onScopeChange?: (s: AnalyticsScope) => void;
}) {
  const { t } = useLang();
  const [d, setD] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  // Collapsed by default: the heavy aggregate queries only run when the user opens it.
  const [open, setOpen] = useState(false);

  // Controlled by the parent (leads page ⇄ table) or self-managed (coverage page).
  const isControlled = controlledScope !== undefined && onScopeChange !== undefined;
  const [internal, setInternal] = useState<AnalyticsScope>(EMPTY_SCOPE);
  const s = isControlled ? controlledScope! : internal;
  const setScope = useCallback(
    (next: AnalyticsScope) => (isControlled ? onScopeChange!(next) : setInternal(next)),
    [isControlled, onScopeChange],
  );
  const { country, cityId, zoneId } = s;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (cityId) params.set("cityId", cityId);
    if (zoneId) params.set("zoneId", zoneId);
    setLoading(true);
    try {
      setD(await apiGet<Analytics>(`/api/prospect/analytics?${params.toString()}`));
    } catch {
      /* keep previous data on error */
    } finally {
      setLoading(false);
    }
  }, [country, cityId, zoneId]);

  // Fetch only while open (and refetch on scope changes while open).
  useEffect(() => {
    if (open) load();
  }, [load, open]);

  const catLabel = (id: string) => t.categories[id] ?? id;

  const level: "global" | "country" | "city" | "zone" = zoneId ? "zone" : cityId ? "city" : country ? "country" : "global";
  const cityName = useMemo(() => d?.byCity.find((c) => String(c.cityId) === cityId)?.city ?? null, [d, cityId]);
  const zoneName = useMemo(() => d?.topZones.find((z) => String(z.zoneId) === zoneId)?.zone ?? null, [d, zoneId]);
  const placeLabel = zoneName ?? cityName ?? country ?? t.analytics.scopeGlobal;
  const scopeKey = `${country}|${cityId}|${zoneId}`;

  const drillCountry = (c: string) => setScope({ country: c, cityId: "", zoneId: "" });
  const drillCity = (c: { cityId: number }) => setScope({ ...s, cityId: String(c.cityId), zoneId: "" });
  const drillZone = (z: { zoneId: number; cityId: number; country: string }) =>
    setScope({ country: z.country, cityId: String(z.cityId), zoneId: String(z.zoneId) });

  const auditedPct = d && d.kpis.total ? Math.round((d.kpis.audited / d.kpis.total) * 100) : 0;
  // At city level, only offer a zone drill-down when the city actually has >1 zone.
  const showZoneNav = level === "global" || (level === "city" && (d?.topZones.length ?? 0) > 1);
  const selectCls = "rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white focus:border-[var(--peri)]/40 focus:outline-none disabled:opacity-40";

  return (
    <MotionConfig reducedMotion="user">
      <div className="pa-card p-4">
        {/* ── Header: collapse + breadcrumb + subtitle ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
              {t.analytics.title}
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                <Crumb label={t.analytics.scopeGlobal} active={level === "global"} onClick={() => setScope(EMPTY_SCOPE)} />
                {country && (
                  <>
                    <span className="text-[var(--ink-mute)]">›</span>
                    <Crumb label={country} active={level === "country"} onClick={() => setScope({ country, cityId: "", zoneId: "" })} />
                  </>
                )}
                {cityName && (
                  <>
                    <span className="text-[var(--ink-mute)]">›</span>
                    <Crumb label={cityName} active={level === "city"} onClick={() => setScope({ country, cityId, zoneId: "" })} />
                  </>
                )}
                {zoneName && (
                  <>
                    <span className="text-[var(--ink-mute)]">›</span>
                    <Crumb label={zoneName} active onClick={() => {}} />
                  </>
                )}
              </div>
              <p className="text-xs text-[var(--ink-mute)]">
                {d ? t.analytics.scopeSubtitle(placeLabel, d.kpis.total, d.kpis.sectors) : open ? t.common.loading : t.analytics.expandHint}
              </p>
            </div>
          </div>

          {/* ── Scope selectors — only when self-managed (the leads page already has its own filter bar) ── */}
          {!isControlled && open && (
            <div className="flex flex-wrap items-center gap-2">
              <select value={country} onChange={(e) => setScope({ country: e.target.value, cityId: "", zoneId: "" })} className={selectCls} aria-label={t.analytics.fCountry}>
                <option value="" className="bg-[#111]">{t.analytics.allCountries}</option>
                {d?.byCountry.map((c) => <option key={c.country} value={c.country} className="bg-[#111]">{c.country}</option>)}
              </select>
              <select value={cityId} onChange={(e) => setScope({ country, cityId: e.target.value, zoneId: "" })} className={selectCls} disabled={!country} aria-label={t.analytics.fCity}>
                <option value="" className="bg-[#111]">{t.analytics.allCities}</option>
                {d?.byCity.map((c) => <option key={c.cityId} value={c.cityId} className="bg-[#111]">{c.city}</option>)}
              </select>
              <select value={zoneId} onChange={(e) => setScope({ country, cityId, zoneId: e.target.value })} className={selectCls} disabled={!cityId || (d?.topZones.length ?? 0) <= 1} aria-label={t.analytics.fZone}>
                <option value="" className="bg-[#111]">{t.analytics.allZones}</option>
                {cityId ? d?.topZones.map((z) => <option key={z.zoneId} value={z.zoneId} className="bg-[#111]">{z.zone}</option>) : null}
              </select>
              {level !== "global" && (
                <button onClick={() => setScope(EMPTY_SCOPE)} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs text-[var(--ink-soft)] hover:text-white">{t.analytics.reset}</button>
              )}
            </div>
          )}
        </div>

        {open && d && (
          <div className={`mt-4 transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
            {/* ── KPI summary row (updates to scope) ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label={t.analytics.kTotal} value={d.kpis.total} />
              <StatCard label={t.analytics.kSectors} value={d.kpis.sectors} accent="#8E8FFA" />
              <StatCard label={t.analytics.kCities} value={d.kpis.cities} accent="#7752FE" />
              <StatCard label={t.analytics.kZones} value={d.kpis.zones} accent="#38bdf8" />
              <StatCard label={t.analytics.kAudited} value={d.kpis.audited} sub={`${auditedPct}%`} accent="#34d399" />
              <StatCard label={t.analytics.kHot} value={d.kpis.hot} accent="#fb7185" />
            </div>

            {/* ── Scoped charts (crossfade between scopes) ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={scopeKey}
                variants={containerV}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {/* Country navigator — global level only */}
                {level === "global" && (
                  <motion.div variants={cardV}>
                    <ChartCard title={t.analytics.byCountry} hint={t.analytics.drillHint}>
                      <HBar data={d.byCountry.map((c) => ({ label: c.country, value: c.total }))} color={byIndex} onBarClick={(i) => drillCountry(d.byCountry[i].country)} />
                    </ChartCard>
                  </motion.div>
                )}

                {/* City navigator — within the selected country */}
                {level === "country" && (
                  <motion.div variants={cardV}>
                    <ChartCard title={t.analytics.byCity} hint={t.analytics.drillHint}>
                      <HBar data={d.byCity.map((c) => ({ label: c.city, value: c.total }))} color={byIndex} labelW={130} onBarClick={(i) => drillCity(d.byCity[i])} />
                    </ChartCard>
                  </motion.div>
                )}

                {/* Zone navigator — global top zones, or the selected city's zones */}
                {showZoneNav && (
                  <motion.div variants={cardV}>
                    <ChartCard title={level === "city" ? t.analytics.zonesHere : t.analytics.topZones} hint={t.analytics.drillHint}>
                      <HBar data={d.topZones.map((z) => ({ label: z.zone, value: z.total }))} color={byIndex} labelW={130} onBarClick={(i) => drillZone(d.topZones[i])} />
                    </ChartCard>
                  </motion.div>
                )}

                {/* Sectors / categories — always, scoped */}
                <motion.div variants={cardV}>
                  <ChartCard title={t.analytics.byCategory} hint={t.analytics.total}>
                    <HBar data={d.byCategory.map((c) => ({ label: catLabel(c.category), value: c.total }))} color={byIndex} />
                  </ChartCard>
                </motion.div>

                {variant === "leads" && (
                  <>
                    <motion.div variants={cardV}>
                      <ChartCard title={t.analytics.scoreDist} hint={t.analytics.score}>
                        <VBars data={[
                          { label: t.analytics.bHot, value: d.scoreBuckets.hot, color: "#fb7185" },
                          { label: t.analytics.bWarm, value: d.scoreBuckets.warm, color: "#fbbf24" },
                          { label: t.analytics.bCool, value: d.scoreBuckets.cool, color: "#38bdf8" },
                          { label: t.analytics.bCold, value: d.scoreBuckets.cold, color: "#34d399" },
                          { label: t.analytics.bUnaudited, value: d.scoreBuckets.unaudited, color: "rgba(255,255,255,.22)" },
                        ]} />
                      </ChartCard>
                    </motion.div>

                    <motion.div variants={cardV}>
                      <ChartCard title={t.analytics.auditState}>
                        <Donut
                          data={[
                            { label: t.analytics.audited, value: d.kpis.audited, color: "#34d399" },
                            { label: t.analytics.unaudited, value: Math.max(0, d.kpis.total - d.kpis.audited), color: "rgba(255,255,255,.2)" },
                          ]}
                          centerValue={`${auditedPct}%`}
                          centerLabel={t.analytics.auditedCenter}
                        />
                      </ChartCard>
                    </motion.div>

                    <motion.div variants={cardV}>
                      <ChartCard title={t.analytics.topIssues} hint={t.analytics.salesOpps}>
                        <HBar data={d.topIssues.map((i) => ({ label: t.issues[i.issue] ?? i.issue, value: i.n }))} color="#fbbf24" labelW={130} />
                      </ChartCard>
                    </motion.div>

                    {/* Per-country comparison only makes sense at the global level */}
                    {level === "global" && (
                      <motion.div variants={cardV}>
                        <ChartCard title={t.analytics.avgByCountry}>
                          <HBar data={d.byCountry.map((c) => ({ label: c.country, value: c.avgScore }))} color="#fb7185" />
                        </ChartCard>
                      </motion.div>
                    )}
                  </>
                )}

                {variant === "coverage" && level === "global" && (
                  <>
                    <motion.div variants={cardV} className="sm:col-span-2 lg:col-span-1">
                      <ChartCard title={t.analytics.coverageByCountry} hint={t.analytics.coveredPlanned}>
                        <StackedHBar data={d.countryProgress.map((p) => ({
                          label: p.country,
                          right: `${p.covered}/${p.planned}`,
                          segments: [
                            { value: p.covered, color: "#34d399", label: t.analytics.audited },
                            { value: Math.max(0, p.planned - p.covered), color: "rgba(255,255,255,.14)", label: t.coverage.stMissing },
                          ],
                        }))} />
                      </ChartCard>
                    </motion.div>

                    <motion.div variants={cardV}>
                      <ChartCard title={t.analytics.hotByCountry} hint={t.analytics.scoreGte}>
                        <HBar data={d.byCountry.map((c) => ({ label: c.country, value: c.hot }))} color="#fb7185" />
                      </ChartCard>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

function Crumb({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded px-1 py-0.5 transition-colors ${active ? "text-white" : "text-[var(--ink-soft)] hover:text-white"}`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </button>
  );
}
