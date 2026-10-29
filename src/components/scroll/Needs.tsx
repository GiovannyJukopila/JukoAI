"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { openQuote } from "@/lib/quote";
import { ArrowUpRight } from "../icons";
import { Reveal } from "../Reveal";
import { RevealTitle } from "./RevealTitle";
import { ramp } from "./ramp";

const ease = [0.22, 1, 0.36, 1] as const;

type Need = { q: string; a: string; d: string };

/* One card of the deck: it pins under the previous ones and shrinks back as the next ones arrive. */
function NeedCard({ need, i, total, progress, pick, onPick }: {
  need: Need; i: number; total: number; progress: MotionValue<number>; pick: string; onPick: () => void;
}) {
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
          <span className="pstack__step">{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} · {need.a}</span>
          <h3>{need.q}</h3>
          <p>{need.d}</p>
          <button type="button" className="btn pstack__cta" onClick={onPick} aria-haspopup="dialog">{pick} <ArrowUpRight /></button>
        </div>
        {!reduce && <motion.span className="pstack__shade" style={{ opacity: dim }} aria-hidden="true" />}
      </motion.article>
    </div>
  );
}

/* "What does your business need?": start from the problem, as a deck of cards that stack while you scroll;
   each card opens the quote quiz with that need ticked. */
export function Needs({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const n = dict.needs;
  // the cards follow the order of the quiz options (app, web, AI, custom system, advice)
  const options = dict.contact.form.needOptions;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section className="section needs" id="needs">
      <Reveal className="section__head">
        <span className="eyebrow">{n.eyebrow}</span>
        <RevealTitle className="section__title" text={n.title} />
        <p className="section__sub">{n.sub}</p>
      </Reveal>

      <div className="pstack" ref={ref}>
        {n.items.map((it, i) => (
          <NeedCard key={it.q} need={it} i={i} total={n.items.length} progress={scrollYProgress} pick={n.pick} onPick={() => openQuote([options[i]])} />
        ))}
      </div>

      <motion.div
        className="needs__foot"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease }}
      >
        <p>{n.foot}</p>
        <button type="button" className="btn" onClick={() => openQuote([options[4]])} aria-haspopup="dialog">{n.cta} <ArrowUpRight /></button>
      </motion.div>
    </section>
  );
}
