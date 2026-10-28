"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeIcon } from "./icons";
import { followSystemTheme, setThemePref, useThemePref, type ThemePref } from "@/lib/theme";

type Labels = { label: string; system: string; light: string; dark: string };
const OPTIONS: ThemePref[] = ["system", "light", "dark"];

/** Navbar theme picker: a round button with the current choice that opens System / Light / Dark. */
export function ThemeToggle({ t }: { t: Labels }) {
  const pref = useThemePref();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => followSystemTheme(), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="theme" ref={root}>
      <button
        type="button"
        className="theme__btn"
        aria-label={`${t.label}: ${t[pref]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeIcon name={pref} size={17} />
      </button>
      <div className={`theme__menu${open ? " is-open" : ""}`} role="menu" aria-label={t.label}>
        {OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            role="menuitemradio"
            aria-checked={pref === o}
            tabIndex={open ? 0 : -1}
            className={pref === o ? "is-active" : ""}
            onClick={() => { setThemePref(o); setOpen(false); }}
          >
            <ThemeIcon name={o} size={15} />
            {t[o]}
          </button>
        ))}
      </div>
    </div>
  );
}
