"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { ServiceGlyph, LogoMark, Check } from "./icons";
import type { ServiceIcon } from "@/lib/content";

const STEP_ICONS: ServiceIcon[] = ["integration", "cloud", "ai", "mobile"];

export function AutomationFlow({ locale }: { locale: Locale }) {
  const f = getDict(locale).showcase.flow;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // pointer-driven 3D parallax
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 120, damping: 20, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), spring);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { px.set(0); py.set(0); };

  return (
    <div className="eng-stage" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.div className="eng-card" style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}>
        <div className="eng-surface">
          <span className="eng-glow" aria-hidden="true" />
          <span className="eng-grid" aria-hidden="true" />

          <div className="eng-head">
            <span className="eng-brand">
              <span className="eng-brand__logo"><LogoMark size={16} /></span>
              <span className="eng-brand__name">Juko<i>·</i>{f.title}</span>
            </span>
            <span className="eng-live"><i />{f.live}</span>
          </div>

          <div className="eng-flow">
            <div className="eng-rail" aria-hidden="true">
              <motion.div className="eng-rail__fill"
                initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
                animate={reduce ? undefined : { scaleY: [0, 1] }}
                transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
              />
              {!reduce && (
                <motion.span className="eng-rail__pulse"
                  animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5, times: [0, 0.06, 0.94, 1] }}
                />
              )}
            </div>

            {f.steps.map((step, i) => (
              <motion.div className={`eng-node${i === 2 ? " is-ai" : ""}`} key={i}
                initial={reduce ? false : { opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.12 }}
              >
                <span className="eng-node__icon"><ServiceGlyph name={STEP_ICONS[i]} /></span>
                <div className="eng-node__body">
                  <strong>{step.t}</strong>
                  <span>{step.s}</span>
                </div>
                <span className="eng-node__tag">{i === 2 ? "AI" : `0${i + 1}`}</span>
                <span className="eng-node__check"><Check size={12} /></span>
              </motion.div>
            ))}
          </div>

          <div className="eng-foot">
            <div className="eng-foot__metric">
              <span className="eng-foot__label">{f.metric}</span>
              <span className="eng-foot__value">{f.metricValue}</span>
            </div>
            <div className="eng-eq" aria-hidden="true">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.11}s` }} />
              ))}
            </div>
          </div>
        </div>

        {/* floating depth layers — sell the 3D motion */}
        <div className="eng-chip eng-chip--lat" aria-hidden="true">
          <span className="eng-chip__ico"><Check size={13} /></span>
          <div><b>{f.time}</b></div>
        </div>
        <div className="eng-chip eng-chip--spark" aria-hidden="true">
          <svg className="eng-spark" viewBox="0 0 72 28" preserveAspectRatio="none">
            <defs>
              <linearGradient id="engSpark" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#C2D9FF" />
                <stop offset="1" stopColor="#7752FE" />
              </linearGradient>
            </defs>
            <polyline points="2,22 13,16 24,19 35,9 46,13 57,5 70,8" />
            <circle className="eng-spark__dot" cx="70" cy="8" r="2.6" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
