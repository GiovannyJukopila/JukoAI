"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiGet } from "../_lib";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { useLang, type Lang } from "../_i18n";
import { ENABLE_OPERATIONS, ENABLE_CONTENT_INTEL } from "@/config/features";

/* ── SVG nav icon set (stroke, currentColor, 24-grid) ──────────────── */
const NavIcon = {
  leads: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  coverage: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3z" /><path d="M9 3v15M15 6v15" />
    </svg>
  ),
  operations: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /><path d="M9.5 9.5h5v5h-5z" />
    </svg>
  ),
  intel: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17l5-5 4 4 8-9" /><path d="M15 7h6v6" /><circle cx="8" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  social: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5 15.4 6.6M8.6 13.5l6.8 3.9" />
    </svg>
  ),
  radar: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.07 4.93A10 10 0 1 0 22 12" /><path d="M15.54 8.46A5 5 0 1 0 17 12" />
      <circle cx="12" cy="12" r="1" fill="currentColor" /><path d="m12 12 7-7" />
    </svg>
  ),
  tareas: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="6" height="14" rx="1.5" /><rect x="11" y="5" width="6" height="9" rx="1.5" />
      <path d="M19 5h2v14h-2" />
    </svg>
  ),
  goals: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 13V2l8 4-8 4" /><path d="M20.55 10.23A9 9 0 1 1 8 4.94" /><path d="M8 10a5 5 0 1 0 8.9 2.02" />
    </svg>
  ),
};

type Section = "leads" | "coverage" | "operations" | "intel" | "social" | "radar" | "tareas" | "goals";
// Sidebar order (plan Fase 2.5): Negocios → Social Studio → Radar IA → Tareas →
// Goals. Operaciones y Content Intel quedan detrás de flags (deprecadas).
const NAV: { key: Section; href: string }[] = [
  { key: "leads", href: "/prospect/leads" },
  { key: "social", href: "/prospect/social" },
  { key: "radar", href: "/prospect/radar" },
  { key: "tareas", href: "/prospect/tareas" },
  { key: "goals", href: "/prospect/goals" },
  ...(ENABLE_OPERATIONS ? [{ key: "operations", href: "/prospect/operations" } as const] : []),
  ...(ENABLE_CONTENT_INTEL ? [{ key: "intel", href: "/prospect/intel" } as const] : []),
];

export function AppChrome({ user, showChrome, children }: { user: string | null; showChrome: boolean; children: ReactNode }) {
  const { lang, setLang, t } = useLang();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // Close the mobile drawer on route change.
  useEffect(() => { setDrawer(false); }, [pathname]);

  const active: Section = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.key ?? "leads";

  const ambient = (
    <div className="pa-ambient" aria-hidden="true">
      <div className="pa-ambient__grid" />
      <div className="pa-ambient__beam" />
    </div>
  );

  // Login / unauthenticated view — ambient backdrop only, centred content.
  if (!showChrome) {
    return (
      <>
        {ambient}
        <main className="relative z-[1] min-h-dvh">{children}</main>
      </>
    );
  }

  return (
    <>
      {ambient}
      <div className={`pa-scrim ${drawer ? "is-open" : ""}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <div className="pa-shell">
        <aside className={`pa-side ${drawer ? "is-open" : ""}`} aria-label={t.nav.leads}>
          <Link href="/prospect/leads" className="pa-brand">
            <span className="pa-brand__mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M4 7l8-4 8 4M4 7v10l8 4 8-4V7" />
              </svg>
            </span>
            <span className="pa-brand__txt">
              <span className="pa-brand__name">Juko<b>Prospect</b></span>
              <span className="pa-brand__tag">Panel interno</span>
            </span>
          </Link>

          <nav className="pa-nav" aria-label="Primary">
            <span className="pa-nav__label">Menú</span>
            {NAV.map((n) => (
              <Link key={n.key} href={n.href} className={`pa-nav-link ${active === n.key ? "is-active" : ""}`} aria-current={active === n.key ? "page" : undefined}>
                <span className="pa-nav-link__icon">{NavIcon[n.key]}</span>
                <span className="pa-nav-link__txt">{t.nav[n.key]}</span>
                <span className="pa-nav-link__chev" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </span>
              </Link>
            ))}
          </nav>

          <div className="pa-side__foot">
            <SpendPanel />
            {user && (
              <div className="flex items-center justify-between gap-2 rounded-[14px] border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-gradient-to-br from-[var(--peri)] to-[var(--violet)] text-[11px] font-bold text-white">
                    {user.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate text-xs text-[var(--ink-soft)]">{user}</span>
                </span>
                <UserMenu user={user} label={t.nav.logout} compact />
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="pa-topbar">
            <button className="pa-burger" onClick={() => setDrawer((v) => !v)} aria-label="Menu" aria-expanded={drawer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <div className="pa-topbar__title">
              <span className="pa-topbar__crumb">Prospect</span>
              <span className="pa-topbar__h">{t.nav[active]}</span>
            </div>
            <div className="pa-topbar__spacer" />
            <div className="pa-topbar__actions">
              <NotificationBell />
              <div className="pa-lang" role="group" aria-label="Idioma / Language">
                {(["es", "en"] as const).map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={lang === l ? "is-active" : ""} aria-pressed={lang === l}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <main className="pa-main">
            <div className="pa-main__inner">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ── Live API-spend panel (sidebar footer) ─────────────────────────── */
type Usage = { total: { requests: number; costUsd: number } };
function SpendPanel() {
  const { t } = useLang();
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => apiGet<Usage>("/api/prospect/usage").then((u) => alive && setUsage(u)).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!usage) return null;
  return (
    <div className="pa-spend" title={t.usage.title}>
      <div className="pa-spend__top">
        <span className="pa-spend__label">API spend</span>
        <span className="pa-spend__live"><i />live</span>
      </div>
      <div className="pa-spend__row">
        <span className="pa-spend__val">${usage.total.costUsd.toFixed(3)}</span>
        <span className="pa-spend__calls">{usage.total.requests.toLocaleString()} calls</span>
      </div>
    </div>
  );
}
