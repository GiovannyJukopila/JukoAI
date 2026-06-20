"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { Counter } from "./Counter";
import { HeroDevice } from "./HeroDevice";

const lineVariants = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: "0%",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const, delay: 0.15 + i * 0.09 },
  }),
};

export function Hero({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const reduce = useReducedMotion();
  const home = `/${locale}`;

  const lines = [
    <>{dict.hero.t1}</>,
    <>{dict.hero.t2}</>,
    <span className="grad" key="g">{dict.hero.t3}</span>,
  ];

  return (
    <section className="hero" id="top">
      <div className="hero__grid">
      <div className="hero__inner">
        <motion.span
          className="hero__badge"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="dot" />
          {dict.hero.badge}
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

        <motion.p
          className="hero__lead"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          {dict.hero.lead}
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
        >
          <Link href={`${home}#contact`} className="btn btn--lg">{dict.hero.cta1}</Link>
          <Link href={`${home}/proyectos`} className="btn btn--ghost btn--lg">{dict.hero.cta2}</Link>
        </motion.div>

        <motion.div
          className="hero__stats"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
        >
          <div className="stat"><b><Counter to={8} prefix="+" /></b><span>{dict.hero.s1}</span></div>
          <div className="stat"><b><Counter to={40} prefix="+" /></b><span>{dict.hero.s2}</span></div>
          <div className="stat"><b><Counter to={12} prefix="+" /></b><span>{dict.hero.s3}</span></div>
        </motion.div>
      </div>

      <motion.div
        className="hero__visual"
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      >
        <HeroDevice locale={locale} />
      </motion.div>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span>{dict.hero.scroll}</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  );
}
