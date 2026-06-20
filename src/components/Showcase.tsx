"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { AutomationFlow } from "./AutomationFlow";
import { Check } from "./icons";

export function Showcase({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const s = dict.showcase;
  const reduce = useReducedMotion();

  const bullets = [s.b1, s.b2, s.b3];

  return (
    <section className="section showcase" id="showcase">
      <div className="showcase__grid">
        <div className="showcase__text">
          <motion.span className="eyebrow"
            initial={reduce ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}>{s.eyebrow}</motion.span>
          <motion.h2 className="section__title" style={{ textAlign: "left" }}
            initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.05 }}>{s.title}</motion.h2>
          <motion.p style={{ color: "var(--ink-soft)", fontSize: "1.05rem", marginBottom: "1.8rem" }}
            initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}>{s.lead}</motion.p>
          <ul className="showcase__bullets">
            {bullets.map((b, i) => (
              <motion.li key={i}
                initial={reduce ? false : { opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}>
                <span className="showcase__check"><Check size={14} /></span>
                <span><b>{b.t}</b>: {b.d}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="showcase__visual">
          <AutomationFlow locale={locale} />
        </div>
      </div>
    </section>
  );
}
