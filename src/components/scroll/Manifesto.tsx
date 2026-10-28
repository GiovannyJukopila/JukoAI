"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { ramp } from "./ramp";

/*
 * "How we make it real": four big words slide in from both sides. The five-step walk that follows
 * is ProcessHolo.
 */
export function Manifesto({ locale }: { locale: Locale }) {
  const m = getDict(locale).manifesto;
  const reduce = useReducedMotion();
  const wordsRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: band } = useScroll({ target: wordsRef, offset: ["start end", "end start"] });
  const xLeft = useTransform(band, (v) => `${ramp(0, 1, -14, 10)(v)}%`);
  const xRight = useTransform(band, (v) => `${ramp(0, 1, 14, -10)(v)}%`);

  return (
    <section className="manifesto" id="manifesto">
      <div className="manifesto__words" ref={wordsRef} aria-label={m.words.join(" ")}>
        {m.words.map((w, i) => (
          <motion.span
            key={w}
            aria-hidden="true"
            className={`manifesto__big${i % 2 ? " manifesto__big--out" : ""}`}
            style={reduce ? undefined : { x: i % 2 ? xRight : xLeft }}
          >
            {w}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
