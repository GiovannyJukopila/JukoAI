"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { LiveChart } from "./LiveChart";
import { ServiceGlyph, LogoMark } from "./icons";
import type { ServiceIcon } from "@/lib/content";

const ROW_ICONS: ServiceIcon[] = ["ai", "integration", "mobile"];

export function HeroDevice({ locale }: { locale: Locale }) {
  const hero = getDict(locale).hero;
  const app = hero.app;
  const dash = hero.dash;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 120, damping: 20, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-13, 13]), spring);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), spring);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { px.set(0); py.set(0); };

  return (
    <div className="device-stage" ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} aria-hidden="true">
      <motion.div className="device-tilt" style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}>

        {/* Desktop · admin panel */}
        <div className={`desktop${reduce ? "" : " float-slow"}`}>
          <div className="desktop__bar"><i /><i /><i /><span className="desktop__url">panel.juko.ai</span></div>
          <div className="dash">
            <div className="dash-side">
              <span className="dash-side__logo"><LogoMark size={20} /></span>
              <span className="dash-side__nav"><i className="on" /><i /><i /><i /></span>
            </div>
            <div className="dash-main">
              <div className="dash-head">
                <div className="dash-head__t"><strong>{dash.title}</strong><span>{dash.sub}</span></div>
                <span className="dash-live"><i />{app.live}</span>
              </div>
              <div className="dash-kpis">
                {dash.kpis.map((k, i) => (
                  <div className="dash-kpi" key={i}>
                    <span className="dash-kpi__l">{k.l}</span>
                    <span className="dash-kpi__v">{k.v}</span>
                    <span className="dash-kpi__d">{k.d}</span>
                  </div>
                ))}
              </div>
              <div className="dash-chart">
                <span className="dash-card__label">{dash.chart}</span>
                <div className="dash-chart__plot"><LiveChart /></div>
              </div>
              <div className="dash-bottom">
                <div className="dash-card">
                  <span className="dash-card__label">{dash.bars}</span>
                  <span className="dash-bars">{Array.from({ length: 7 }).map((_, i) => <i key={i} />)}</span>
                </div>
                <div className="dash-card dash-ring-card">
                  <span className="dash-ring"><b>{dash.ringValue}</b></span>
                  <span className="dash-card__label">{dash.ring}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* iPhone · in front */}
        <div className={`phone-wrap${reduce ? "" : " float-phone"}`}>
          <div className="phone">
            <div className="phone__frame">
              <div className="phone__screen">
                <div className="phone__island" />
                <div className="app">
                  <div className="app__status">
                    <span>9:41</span>
                    <span className="app__bars"><i /><i /><i /><i /></span>
                  </div>
                  <div className="app__head">
                    <span className="app__logo"><LogoMark size={22} /></span>
                    <div>
                      <strong>{app.brand}</strong>
                      <span className="app__sub">{app.panel}</span>
                    </div>
                    <span className="app__live"><i />{app.live}</span>
                  </div>
                  <div className="app__metric">
                    <span className="app__metric-label">{app.metric}</span>
                    <div className="app__metric-row">
                      <span className="app__metric-value">{app.value}</span>
                      <motion.span className="app__metric-growth"
                        animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
                        transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7L5 3l2.5 4" /></svg>
                        {app.growth}
                      </motion.span>
                    </div>
                    <div className="app__chart"><LiveChart /></div>
                  </div>
                  <div className="app__rows">
                    {app.rows.map((row, i) => (
                      <div className="app__row" key={i}>
                        <span className="app__row-icon"><ServiceGlyph name={ROW_ICONS[i]} /></span>
                        <span className="app__row-name">{row.name}</span>
                        <span className="app__row-tag">{row.tag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
