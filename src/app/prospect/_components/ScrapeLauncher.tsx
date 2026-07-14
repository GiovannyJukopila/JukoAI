"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend, type Category } from "../_lib";

type CheckResult = { action: string; reason: string; message: string };
type ScrapeSummary = {
  ran: boolean;
  status: string;
  created: number;
  updated: number;
  total: number;
  apiCalls: number;
  error?: string;
  decision: { action: string; message: string };
};
type Zone = { id: number; country: string; city: string | null; name: string };

const OTHER = "__other__";

/**
 * Launch a new scrape (country + zone + category). País and Zona are dropdowns fed
 * by the zones catalog (selecting a country filters its zones); an "Otro…" option
 * reveals a text input so brand-new countries/zones can still be added.
 * Respects Section 0: warns before spending quota on a recently-evaluated zone.
 */
export function ScrapeLauncher({ onDone }: { onDone?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  const [countrySel, setCountrySel] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [zoneSel, setZoneSel] = useState("");
  const [customZone, setCustomZone] = useState("");
  const [category, setCategory] = useState("restaurants");
  const [thorough, setThorough] = useState(false);

  const [check, setCheck] = useState<CheckResult | null>(null);
  const [result, setResult] = useState<ScrapeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadZones = () =>
    apiGet<{ zones: Zone[] }>("/api/prospect/zones").then((d) => setZones(d.zones)).catch(() => {});

  useEffect(() => {
    apiGet<{ categories: Category[] }>("/api/prospect/categories").then((d) => setCategories(d.categories)).catch(() => {});
    loadZones();
  }, []);

  const countries = useMemo(() => [...new Set(zones.map((z) => z.country))].sort(), [zones]);
  // Default the country selection once the catalog loads.
  useEffect(() => {
    if (!countrySel && countries.length) setCountrySel(countries.includes("Malta") ? "Malta" : countries[0]);
  }, [countries, countrySel]);

  const country = countrySel === OTHER ? customCountry.trim() : countrySel;
  // Split this country's zones into leaf localities (city == zone) + city groups (barrios).
  const { plainZones, cityGroups } = useMemo(() => {
    const list = zones.filter((z) => z.country === country);
    const plain = list.filter((z) => !z.city || z.city === z.name).map((z) => z.name);
    const groups = new Map<string, string[]>();
    for (const z of list) {
      if (!z.city || z.city === z.name) continue;
      if (!groups.has(z.city)) groups.set(z.city, []);
      groups.get(z.city)!.push(z.name);
    }
    return { plainZones: plain, cityGroups: groups };
  }, [zones, country]);
  const hasZones = plainZones.length > 0 || cityGroups.size > 0;
  const zone = zoneSel === OTHER ? customZone.trim() : zoneSel;
  // Resolve the city the selected zone belongs to (for precise scraping of barrios).
  const zoneCity = useMemo(
    () => zones.find((z) => z.country === country && z.name === zone)?.city ?? null,
    [zones, country, zone],
  );

  const reset = () => { setCheck(null); setResult(null); setError(null); };

  async function run(force: boolean) {
    if (!country || !zone || !category) {
      setError("Completa país, zona y categoría.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (!force) {
        const c = await apiGet<CheckResult>(
          `/api/prospect/coverage/check?country=${encodeURIComponent(country)}&zone=${encodeURIComponent(zone)}&category=${encodeURIComponent(category)}`,
        );
        if (c.action === "skip_recent" || c.action === "in_progress") {
          setCheck(c);
          setBusy(false);
          return;
        }
      }
      const r = await apiSend<ScrapeSummary>("/api/prospect/scrape", "POST", { country, zone, city: zoneCity, category, force, thorough });
      setResult(r);
      setCheck(null);
      await loadZones(); // a new zone may have just been created
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectCls = "w-44 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white cursor-pointer";
  const inputCls = "w-44 rounded-lg border border-[var(--peri)]/40 bg-black/30 px-2 py-1.5 text-sm text-white";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-sm font-medium text-white">Lanzar búsqueda de zona</div>
      <div className="flex flex-wrap items-end gap-2">
        {/* País */}
        <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
          País
          <select
            value={countrySel}
            onChange={(e) => { setCountrySel(e.target.value); setZoneSel(""); setCustomZone(""); reset(); }}
            className={selectCls}
          >
            {countries.map((c) => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
            <option value={OTHER} className="bg-[#111]">+ Otro país…</option>
          </select>
        </label>
        {countrySel === OTHER && (
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            Nuevo país
            <input value={customCountry} onChange={(e) => { setCustomCountry(e.target.value); reset(); }} placeholder="México" className={inputCls} />
          </label>
        )}

        {/* Zona */}
        <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
          Zona / ciudad
          <select value={zoneSel} onChange={(e) => { setZoneSel(e.target.value); reset(); }} className={selectCls}>
            <option value="" className="bg-[#111]">{hasZones ? "Elegir zona…" : "Sin zonas — usa Otra"}</option>
            {plainZones.map((z) => <option key={z} value={z} className="bg-[#111]">{z}</option>)}
            {[...cityGroups.entries()].map(([city, names]) => (
              <optgroup key={city} label={city} className="bg-[#111]">
                {names.map((z) => (
                  <option key={z} value={z} className="bg-[#111]">{z}</option>
                ))}
              </optgroup>
            ))}
            <option value={OTHER} className="bg-[#111]">+ Otra zona…</option>
          </select>
        </label>
        {zoneSel === OTHER && (
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            Nueva zona
            <input value={customZone} onChange={(e) => { setCustomZone(e.target.value); reset(); }} placeholder="St. Julian's" className={inputCls} />
          </label>
        )}

        {/* Categoría */}
        <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
          Categoría
          <select value={category} onChange={(e) => { setCategory(e.target.value); reset(); }} className={selectCls}>
            {categories.map((c) => <option key={c.id} value={c.id} className="bg-[#111]">{c.label}</option>)}
          </select>
        </label>

        <button
          onClick={() => run(false)}
          disabled={busy}
          className="cursor-pointer rounded-lg bg-[var(--violet)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Procesando…" : "Buscar"}
        </button>
      </div>

      {/* Thorough toggle */}
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-[var(--ink-soft)]">
        <input type="checkbox" checked={thorough} onChange={(e) => { setThorough(e.target.checked); reset(); }} className="cursor-pointer accent-[var(--violet)]" />
        Búsqueda exhaustiva — prueba variantes de la categoría para superar el tope de 60 de Google (gasta más cuota).
      </label>

      {error && <p className="mt-3 text-sm text-rose-300">⚠️ {error}</p>}

      {check && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <p>{check.message}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => run(true)} disabled={busy}
              className="cursor-pointer rounded-lg bg-amber-500/80 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-50">
              Refrescar igualmente (gasta cuota)
            </button>
            <button onClick={reset} className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/5">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {result && (() => {
        const catLabel = categories.find((c) => c.id === category)?.label ?? category;
        const where = `${catLabel} en ${zone}`;
        if (!result.ran) {
          return (
            <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
              <p>⏭ {result.decision.message}</p>
            </div>
          );
        }
        // Ran: distinguish "found new ones" vs "you already have them all".
        const allDone = result.created === 0;
        return (
          <div className={`mt-3 rounded-lg border p-3 text-sm ${allDone ? "border-white/15 bg-white/5 text-[var(--ink-soft)]" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}>
            {allDone ? (
              <p>
                ✔ <strong>Ya los tienes todos.</strong> No se encontraron nuevos {where}: 0 nuevos,
                {" "}{result.updated} ya registrados. {thorough ? "Probadas todas las variantes." : "Activa “búsqueda exhaustiva” para intentar encontrar más allá de los 60."}
              </p>
            ) : (
              <p>
                ✅ <strong>{result.created} nuevos</strong> {where} · {result.updated} ya los tenías ·
                {" "}{result.total} en total · {result.apiCalls} llamadas API{result.error ? ` · ⚠️ ${result.error}` : ""}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
