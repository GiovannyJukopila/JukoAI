"use client";

import { useEffect, useState } from "react";

const num = (i: number) => String(i + 1).padStart(2, "0");

/*
 * The document's index. On wide screens a sticky list that marks the section being read;
 * on phones a collapsed "On this page" that closes again once a section is picked.
 */
export function LegalToc({ items, label }: { items: { id: string; title: string }[]; label: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // the active section is the last one whose heading has passed the upper third of the screen
    const els = items.map((it) => document.getElementById(it.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.32;
        let current = els[0]?.id;
        for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
        setActive(current);
      },
      { rootMargin: "0px 0px -60% 0px", threshold: [0, 1] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const list = (
    <ol>
      {items.map((it, i) => (
        <li key={it.id}>
          <a href={`#${it.id}`} aria-current={active === it.id ? "true" : undefined} onClick={() => setOpen(false)}>
            <span>{num(i)}</span>{it.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav className="legal-toc" aria-label={label}>
        <p className="legal-toc__label">{label}</p>
        {list}
      </nav>
      <details className="legal-toc-m" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>{label}<i aria-hidden="true" /></summary>
        {list}
      </details>
    </>
  );
}
