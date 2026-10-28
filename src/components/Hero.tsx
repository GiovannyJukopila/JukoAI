"use client";

import { useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { ArrowUpRight, BoltIcon, Check, PillarIcon, type PillarName } from "./icons";
import { QuoteButton } from "./QuoteButton";
import { LogoLoader } from "./LogoLoader";
import { ramp } from "./scroll/ramp";

// three.js only loads in the browser and in its own chunk, after the headline has painted.
const AppBuilder3D = dynamic(() => import("./ui/app-builder-3d"), {
  ssr: false,
  loading: () => <div className="hero__loader"><LogoLoader size={88} /></div>,
});

const ease = [0.22, 1, 0.36, 1] as const;
const PILLAR_ICONS: PillarName[] = ["advice", "quality", "security", "growth"];
const lineVariants = {
  hidden: { y: "110%" },
  show: (i: number) => ({ y: "0%", transition: { duration: 1, ease, delay: 0.15 + i * 0.1 } }),
};
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease, delay },
});

/*
 * The hero: headline on the left, the 3D construction site of an app on the right
 * (under the copy on a phone). As the page scrolls away the illustration drifts and fades.
 */
export function Hero({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const h = dict.hero;
  const reduce = useReducedMotion();
  const home = `/${locale}`;
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const sceneY = useTransform(scrollYProgress, (v) => `${ramp(0, 1, 0, 14)(v)}%`);
  const sceneOpacity = useTransform(scrollYProgress, ramp(0.35, 0.95, 1, 0.2));
  const hintOpacity = useTransform(scrollYProgress, ramp(0, 0.15, 1, 0));

  const lines = [
    <>{h.t1}</>,
    <>{h.t2}</>,
    <span className="grad" key="g">{h.t3}</span>,
  ];

  return (
    <section className="hero" id="top" ref={sectionRef}>
      <motion.div className="hero__scene" style={reduce ? undefined : { y: sceneY, opacity: sceneOpacity }}>
        <AppBuilder3D locale={locale} />
      </motion.div>
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__grid">
        <div className="hero__inner">
          <motion.span className="hero__badge" {...(reduce ? {} : fadeUp(0.05))}>
            <span className="dot" />
            {h.badge}
          </motion.span>

          <h1 className="hero__title">
            {lines.map((line, i) => (
              <span className="line" key={i}>
                <motion.span
                  style={{ display: "inline-block" }}
                  custom={i}
                  variants={lineVariants}
                  initial={reduce ? false : "hidden"}
                  animate="show"
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div className="hero__actions" {...(reduce ? {} : fadeUp(0.6))}>
            <Link href={`${home}#contact`} className="btn btn--lg">{h.cta1} <ArrowUpRight /></Link>
            <QuoteButton className="btn btn--ghost btn--lg hero__quote"><BoltIcon size={15} />{h.cta2}</QuoteButton>
          </motion.div>
          <motion.p className="hero__promise" {...(reduce ? {} : fadeUp(0.68))}>
            {h.promise.map((p) => <span key={p}><Check size={13} />{p}</span>)}
          </motion.p>

          <motion.ul className="hero__pillars" {...(reduce ? {} : fadeUp(0.75))}>
            {h.pillars.map((p, i) => (
              <li key={p}><span><PillarIcon name={PILLAR_ICONS[i]} /></span>{p}</li>
            ))}
          </motion.ul>
        </div>
      </div>

      <motion.div className="hero__scroll" aria-hidden="true" style={reduce ? undefined : { opacity: hintOpacity }}>
        <span>{h.scroll}</span>
        <span className="hero__scroll-line" />
      </motion.div>
    </section>
  );
}
