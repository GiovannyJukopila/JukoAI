"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./icons";
import { getDict, locales, type Locale } from "@/lib/i18n";

export function Nav({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // strip the leading /es or /en to swap locale while keeping the path
  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, "") || "";
  const home = `/${locale}`;

  const links = [
    { href: `/${locale}/servicios`, label: dict.nav.services },
    { href: `/${locale}/proyectos`, label: dict.nav.work },
    { href: `${home}#process`, label: dict.nav.process },
    { href: `${home}#about`, label: dict.nav.about },
  ];

  const isActive = (href: string) => {
    const clean = href.split("#")[0];
    if (clean === home) return false;
    return pathname.startsWith(clean);
  };

  return (
    <>
      <header className={`nav${scrolled ? " is-scrolled" : ""}`}>
        <Link href={home} className="nav__logo" aria-label="Juko AI">
          <LogoMark priority />
          <span className="nav__logo-text">Juko<b>AI</b></span>
        </Link>

        <nav className="nav__links" aria-label="Principal">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "is-active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav__actions">
          <div className="lang" aria-label="Idioma / Language">
            {locales.map((lc, i) => (
              <span key={lc}>
                {i > 0 && <span className="sep">/</span>}
                <Link href={`/${lc}${pathWithoutLocale}`} className={lc === locale ? "is-active" : ""} hrefLang={lc}>
                  {lc.toUpperCase()}
                </Link>
              </span>
            ))}
          </div>
          <Link href={`${home}#contact`} className="btn btn--sm">{dict.nav.cta}</Link>
          <button
            className={`nav__burger${open ? " is-open" : ""}`}
            aria-label="Menú"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span /><span />
          </button>
        </div>
      </header>

      <div className={`mobile-menu${open ? " is-open" : ""}`} aria-hidden={!open}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
        ))}
        <Link href={`${home}#contact`} className="btn" onClick={() => setOpen(false)}>{dict.nav.cta}</Link>
      </div>
    </>
  );
}
