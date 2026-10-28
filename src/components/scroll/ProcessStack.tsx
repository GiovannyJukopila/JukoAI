"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { Check } from "../icons";
import { ramp } from "./ramp";

type Step = { t: string; d: string; k: readonly string[] };

/* One card of the stack: it pins under the previous ones and shrinks back as the next ones arrive. */
function StackCard({ step, i, total, progress }: { step: Step; i: number; total: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  // Card i settles at about i / (total - 1) of the deck's scroll; it shrinks and dims while the next one covers it.
  const gap = 1 / (total - 1);
  const settled = i * gap;
  const scale = useTransform(progress, ramp(settled, 1, 1, 1 - (total - 1 - i) * 0.045));
  const dim = useTransform(progress, ramp(settled + gap * 0.45, settled + gap, 0, i === total - 1 ? 0 : 0.5));

  return (
    <div className="pstack__slot" style={{ top: `calc(clamp(5.5rem,12vh,8rem) + ${i * 1.4}rem)` }}>
      <motion.article className="pstack__card" style={reduce ? undefined : { scale }}>
        <span className="pstack__num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
        <div className="pstack__body">
          <span className="pstack__step">{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <h3>{step.t}</h3>
          <p>{step.d}</p>
          <ul>
            {step.k.map((k) => <li key={k}><Check size={13} /> {k}</li>)}
          </ul>
        </div>
        {!reduce && <motion.span className="pstack__shade" style={{ opacity: dim }} aria-hidden="true" />}
      </motion.article>
    </div>
  );
}

/* The process as a deck of cards that stack while you scroll. */
export function ProcessStack({ locale }: { locale: Locale }) {
  const steps = getDict(locale).process.steps;
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <div className="pstack" ref={ref}>
      {steps.map((s, i) => (
        <StackCard key={s.t} step={s} i={i} total={steps.length} progress={scrollYProgress} />
      ))}
    </div>
  );
}
