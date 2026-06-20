"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Locale } from "@/lib/i18n";

const input = { x: 30, y: 75 };
const ai = { x: 130, y: 75 };
const outs = [
  { x: 228, y: 36, label: "Email" },
  { x: 228, y: 75, label: "App" },
  { x: 228, y: 114, label: "CRM" },
];

function Dot({ from, to, delay, reduce }: { from: { x: number; y: number }; to: { x: number; y: number }; delay: number; reduce: boolean }) {
  if (reduce) return null;
  return (
    <motion.circle
      r={2.6}
      fill="#C2D9FF"
      initial={{ cx: from.x, cy: from.y, opacity: 0 }}
      animate={{ cx: [from.x, to.x], cy: [from.y, to.y], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.8, ease: "linear", repeat: Infinity, delay, times: [0, 0.1, 0.85, 1] }}
    />
  );
}

export function AIFlow({ locale }: { locale: Locale }) {
  const reduce = useReducedMotion() ?? false;
  const inLabel = locale === "en" ? "Data" : "Datos";
  const aiLabel = locale === "en" ? "AI" : "IA";

  return (
    <svg className="aiflow" viewBox="0 0 258 150" role="img" aria-label={locale === "en" ? "AI automation flow diagram" : "Diagrama de flujo de automatización con IA"}>
      <defs>
        <linearGradient id="aiCore" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8E8FFA" />
          <stop offset="1" stopColor="#7752FE" />
        </linearGradient>
      </defs>

      {/* connectors */}
      <g stroke="rgba(142,143,250,.32)" strokeWidth="1.4" fill="none" strokeDasharray="3 4">
        <line x1={input.x} y1={input.y} x2={ai.x} y2={ai.y} />
        {outs.map((o, i) => <line key={i} x1={ai.x} y1={ai.y} x2={o.x} y2={o.y} />)}
      </g>

      {/* flowing data dots */}
      <Dot from={input} to={ai} delay={0} reduce={reduce} />
      {outs.map((o, i) => <Dot key={i} from={ai} to={o} delay={0.5 + i * 0.25} reduce={reduce} />)}

      {/* input node */}
      <circle cx={input.x} cy={input.y} r={8} fill="rgba(255,255,255,.04)" stroke="#8E8FFA" strokeWidth="1.4" />
      <circle cx={input.x} cy={input.y} r={2.6} fill="#8E8FFA" />
      <text x={input.x} y={input.y + 22} textAnchor="middle" className="aiflow__label">{inLabel}</text>

      {/* AI core (pulsing) */}
      {!reduce && (
        <motion.circle cx={ai.x} cy={ai.y} r={18} fill="none" stroke="#8E8FFA"
          animate={{ r: [18, 26], opacity: [0.5, 0] }} transition={{ duration: 2, ease: "easeOut", repeat: Infinity }} />
      )}
      <circle cx={ai.x} cy={ai.y} r={18} fill="url(#aiCore)" />
      <circle cx={ai.x} cy={ai.y} r={18} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
      <text x={ai.x} y={ai.y + 4} textAnchor="middle" className="aiflow__core-label">{aiLabel}</text>

      {/* output nodes */}
      {outs.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r={7} fill="rgba(255,255,255,.04)" stroke="#C2D9FF" strokeWidth="1.3" />
          <circle cx={o.x} cy={o.y} r={2.2} fill="#C2D9FF" />
          <text x={o.x} y={o.y + 1} dx={-12} textAnchor="end" className="aiflow__label aiflow__label--out">{o.label}</text>
        </g>
      ))}
    </svg>
  );
}
