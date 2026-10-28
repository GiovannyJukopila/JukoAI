"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { finishIntro } from "@/lib/intro";
import { HERO_READY_EVENT, INTRO_KEY } from "@/lib/intro-script";
import { DOT, J_BOTTOM, J_TOP, MARK_VIEWBOX } from "@/lib/logo-paths";

const COPY = {
  es: { tag: "Software · IA · a tu medida", boot: "juko.ai // iniciando", steps: ["tipografías", "contenido", "escena 3d"] },
  en: { tag: "Software · AI · made for you", boot: "juko.ai // starting", steps: ["typefaces", "content", "3d scene"] },
};
const MIN_MS = 1700; // long enough for the mark to draw itself
const MAX_MS = 4500; // never hold the page longer than this

/*
 * First-visit intro. The J draws itself in its gradient, fills, and the dot drops in; "Juko AI"
 * rises letter by letter while a counter measures the real load (fonts, the page, the hero's
 * 3D scene). Then an iris opens from the dot of the J and the page comes in. The markup is in the
 * server HTML and the drawing is pure CSS, so it covers the page from the first paint; the inline
 * script in the layout skips it on later visits of the session and with reduced motion.
 */
export function IntroLoader({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState<boolean[]>([false, false, false]);
  const [hasScene, setHasScene] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- skipped before the first paint by the inline script
    if (!html.classList.contains("intro-on")) { setGone(true); return; }
    try { sessionStorage.setItem(INTRO_KEY, "1"); } catch {}
    window.__lenis?.stop();

    const scene = !!document.querySelector(".hero");
    setHasScene(scene);
    const parts = [0, 0, scene ? 0 : 1]; // typefaces, page, 3D scene
    const mark = (i: number) => {
      parts[i] = 1;
      setDone((d) => d.map((v, k) => v || k === i));
    };
    document.fonts.ready.then(() => mark(0));
    const onLoad = () => mark(1);
    if (document.readyState === "complete") onLoad(); else addEventListener("load", onLoad, { once: true });
    const onScene = () => mark(2);
    if (!scene || window.__jukoHeroReady) onScene(); else addEventListener(HERO_READY_EVENT, onScene, { once: true });

    const t0 = performance.now();
    let shown = 0, raf = 0, leaving = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const leave = () => {
      leaving = true;
      const el = root.current;
      const dot = el?.querySelector(".intro__dot")?.getBoundingClientRect();
      if (el && dot) {
        el.style.setProperty("--ix", `${dot.left + dot.width / 2}px`);
        el.style.setProperty("--iy", `${dot.top + dot.height / 2}px`);
      }
      el?.classList.add("is-leaving");
      // the page starts its own entrance while the iris is still opening
      timers.push(setTimeout(finishIntro, 380));
      timers.push(setTimeout(() => { window.__lenis?.start(); setGone(true); }, 1300));
    };

    const tick = (now: number) => {
      const elapsed = now - t0;
      const ready = elapsed > MAX_MS ? 1 : (parts[0] + parts[1] + parts[2]) / 3;
      // the counter glides toward the real progress, and never faster than the drawing
      shown += (ready - shown) * 0.09;
      if (ready - shown < 0.003) shown = ready;
      const display = Math.min(shown, elapsed / MIN_MS);
      if (count.current) count.current.textContent = String(Math.round(display * 100)).padStart(3, "0");
      if (bar.current) bar.current.style.transform = `scaleX(${display})`;
      if (display >= 1 && !leaving) { leave(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      removeEventListener("load", onLoad);
      removeEventListener(HERO_READY_EVENT, onScene);
    };
  }, []);

  if (gone) return null;
  const steps = hasScene ? t.steps : t.steps.slice(0, 2);
  return (
    <div ref={root} className="intro" aria-hidden="true">
      <div className="intro__center">
        <svg className="intro__mark" viewBox={MARK_VIEWBOX}>
          <defs>
            <linearGradient id="intro-j" gradientUnits="userSpaceOnUse" x1="150" y1="110" x2="20" y2="480">
              <stop offset="0" stopColor="#7ffcdb" /><stop offset=".2" stopColor="#5fd9df" /><stop offset=".35" stopColor="#49c2e3" /><stop offset=".5" stopColor="#4ea4dd" />
              <stop offset=".62" stopColor="#5878d3" /><stop offset=".74" stopColor="#6547ca" /><stop offset=".86" stopColor="#5e12a5" /><stop offset="1" stopColor="#530079" />
            </linearGradient>
            <linearGradient id="intro-dot" gradientUnits="userSpaceOnUse" x1="208" y1="470" x2="304" y2="455">
              <stop offset="0" stopColor="#7a14bd" /><stop offset=".45" stopColor="#5a6fd0" /><stop offset=".75" stopColor="#43bfe4" /><stop offset="1" stopColor="#4fdce2" />
            </linearGradient>
          </defs>
          <g className="intro__fill" fill="url(#intro-j)"><path d={J_TOP} /><path d={J_BOTTOM} /></g>
          <g className="intro__stroke" fill="none" stroke="url(#intro-j)" strokeWidth="5" strokeLinejoin="round">
            <path d={J_TOP} pathLength={1} /><path d={J_BOTTOM} pathLength={1} />
          </g>
          <path className="intro__dot" fill="url(#intro-dot)" d={DOT} />
        </svg>
        <div className="intro__word">
          {"Juko".split("").map((ch, i) => <span key={i} style={{ "--i": i } as React.CSSProperties}>{ch}</span>)}
          <b style={{ "--i": 4 } as React.CSSProperties}>AI</b>
        </div>
        <div className="intro__tag">{t.tag}</div>
      </div>

      <div className="intro__status">
        <span>{t.boot}</span>
        {steps.map((s, i) => (
          <span key={s} className="intro__line"><span>{s}</span><i />{done[i] ? <b>ok</b> : <em>…</em>}</span>
        ))}
      </div>
      <div className="intro__count"><span ref={count}>000</span></div>
      <i className="intro__bar"><b ref={bar} /></i>
    </div>
  );
}
