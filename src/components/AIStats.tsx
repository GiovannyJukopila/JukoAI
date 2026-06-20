"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Locale } from "@/lib/i18n";

// monthly automation throughput — illustrative, premium analytics read
const DATA = [8, 12, 9, 15, 13, 20, 17, 24, 22, 28, 32];
const W = 300;
const H = 84;
const MAX = 36;

export function AIStats({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion() ?? false;
  const en = locale === "en";

  const stepX = W / (DATA.length - 1);
  const pts = DATA.map((d, i) => [i * stepX, H - (d / MAX) * H] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];

  // node that continuously travels along the trend line
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const fade = pts.map((_, i) => (i === 0 || i === pts.length - 1 ? 0 : 1));

  return (
    <div className="aistat">
      <div className="aistat__head">
        <div className="aistat__meta">
          <span className="aistat__label">{en ? "Workflows automated" : "Flujos automatizados"}</span>
          <span className="aistat__value">1,248</span>
        </div>
        <span className="aistat__delta">▲ 38%</span>
      </div>

      <svg className="aistat__chart" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={en ? "Automation throughput trend" : "Tendencia de automatizaciones"}>
        <defs>
          <linearGradient id="aistatFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(142,143,250,.42)" />
            <stop offset="1" stopColor="rgba(142,143,250,0)" />
          </linearGradient>
          <linearGradient id="aistatLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C2D9FF" />
            <stop offset="1" stopColor="#7752FE" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#aistatFill)" />
        <motion.path d={line} fill="none" stroke="url(#aistatLine)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? undefined : { pathLength: 0 }}
          whileInView={reduce ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
        <circle cx={last[0]} cy={last[1]} r="3.2" fill="#dbe8ff" />
        {!reduce && (
          <motion.circle r="3.8" fill="#eef3ff"
            style={{ filter: "drop-shadow(0 0 5px rgba(194,217,255,.95))" }}
            initial={{ cx: xs[0], cy: ys[0], opacity: 0 }}
            animate={{ cx: xs, cy: ys, opacity: fade }}
            transition={{ duration: 3.8, ease: "linear", repeat: Infinity }}
          />
        )}
      </svg>

      <div className="aistat__foot">
        <span>{en ? "Last 30 days" : "Últimos 30 días"}</span>
        <span className="aistat__pill"><i />{en ? "Live" : "En vivo"}</span>
      </div>
    </div>
  );
}
