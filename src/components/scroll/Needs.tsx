"use client";

import { motion, useReducedMotion } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { openQuote } from "@/lib/quote";
import { ArrowUpRight } from "../icons";
import { RevealTitle } from "./RevealTitle";

const ease = [0.22, 1, 0.36, 1] as const;

/* "What does your business need?": start from the problem; each row opens the quote quiz with that need ticked. */
export function Needs({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const n = dict.needs;
  // the rows follow the order of the quiz options (app, web, AI, custom system, advice)
  const options = dict.contact.form.needOptions;
  const reduce = useReducedMotion();

  return (
    <section className="section needs" id="needs">
      <div className="needs__head">
        <span className="eyebrow">{n.eyebrow}</span>
        <RevealTitle className="section__title needs__title" text={n.title} />
        <p className="section__sub">{n.sub}</p>
      </div>

      <ol className="needs__list">
        {n.items.map((it, i) => (
          <motion.li
            key={it.q}
            className="needs__item"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.8, ease, delay: i * 0.04 }}
          >
            <button type="button" className="needs__link" onClick={() => openQuote([options[i]])} aria-haspopup="dialog">
              <span className="needs__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="needs__q">{it.q}</span>
              <span className="needs__a">
                <b>{it.a}</b>
                <span>{it.d}</span>
              </span>
              <span className="needs__arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
            </button>
          </motion.li>
        ))}
      </ol>

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
