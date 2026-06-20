"use client";

import { motion, useReducedMotion } from "framer-motion";

/* A continuously flowing "live" line+area chart for inside the phone.
   Seamless horizontal scroll = data streaming in real time. */
const SEG = 120;
const H = 44;
const N = 22;

function periodicY(t: number) {
  // periodic (period 1) so the long path tiles seamlessly
  const w = Math.sin(t * Math.PI * 2) * 0.55 + Math.sin(t * Math.PI * 4 + 0.6) * 0.26;
  return H * 0.52 - w * (H * 0.34);
}

function buildLine() {
  let d = "";
  for (let i = 0; i <= N * 2; i++) {
    const x = (i / N) * SEG;
    const y = periodicY(i / N);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d.trim();
}

export function LiveChart() {
  const reduce = useReducedMotion();
  const line = buildLine();
  const area = `${line} L${(SEG * 2).toFixed(1)},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${SEG} ${H}`} preserveAspectRatio="none" className="livechart" aria-hidden="true">
      <defs>
        <linearGradient id="lcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16c878" stopOpacity="0.32" />
          <stop offset="1" stopColor="#16c878" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lcLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#16c878" />
          <stop offset="1" stopColor="#7752FE" />
        </linearGradient>
      </defs>
      <motion.g
        animate={reduce ? undefined : { x: [0, -SEG] }}
        transition={{ duration: 5.5, ease: "linear", repeat: Infinity }}
      >
        <path d={area} fill="url(#lcFill)" />
        <path d={line} fill="none" stroke="url(#lcLine)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}
