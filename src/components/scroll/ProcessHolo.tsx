"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { useLiteMotion } from "@/lib/motion-lite";

/*
 * "How we make it real", the 2D take: the same pinned five-step walk as the Manifesto, but the right
 * side is a holographic console that plays each step as an interface: the discovery map, the
 * wireframe turning into the final UI, the code written and shipped, the AI core wired to every
 * channel, and the product live with its results. Everything inside a step is scrubbed by the
 * scroll, so the visitor moves the story at their own pace.
 */

// The console is drawn at a fixed size and scaled to fit its box.
const W = 720;
const H = 540;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
type P = MotionValue<number>;
type Span = [number, number];

const ES = {
  bar: "Juko · pipeline",
  status: ["Analizando", "Diseñando", "Construyendo", "A tu medida", "En vivo"],
  idea: {
    session: "Sesión de análisis",
    chat: [
      { who: "Tú", text: "Quiero una app para que mis clientes reserven." },
      { who: "Juko", text: "Perfecto. Analicemos tu idea juntos." },
    ],
    core: "Tu idea",
    analysing: "IA analizando",
    nodes: ["Reservas", "Pagos online", "Panel admin", "Agente IA"],
    brief: "Brief del proyecto",
    briefRows: ["Objetivo · reservas online", "Usuarios · clientes y equipo", "Plataformas · iOS, Android y web"],
    plan: "Plan del proyecto",
    phases: ["Diseño", "Desarrollo", "IA", "Lanzamiento"],
    chips: ["Alcance ✓", "Plan ✓", "Presupuesto ✓"],
  },
  design: {
    system: "Sistema de diseño",
    color: "Color",
    type: "Tipografía",
    scale: [["Display", "32"], ["Título", "24"], ["Texto", "15"]],
    spacing: "Espaciado",
    layers: "Capas",
    layerRows: ["Cabecera", "Tarjeta de cita", "Servicios", "Botón principal"],
    proto: "Prototipo navegable",
    comps: "Componentes",
    compRows: ["Reservar", "Tarjeta", "Buscar…"],
    cursor: "Diseñador",
  },
  app: { hi: "Hola, Ana", next: "Tu próxima cita", when: "Mañana · 10:30", rows: ["Corte y barba", "Manicura", "Masaje relax"], cta: "Reservar" },
  build: {
    tabs: ["reservas.ts", "api.ts"],
    code: [
      "export async function reservar(cita) {",
      "  const user = await auth.verify(cita.token)",
      "  const slot = await db.slots.lock(cita.hora)",
      "  await pagos.cobrar(user, cita.servicio)",
      '  await ia.notificar(user, "Cita confirmada")',
      "  return { ok: true, slot }",
      "}",
    ],
    term: ["$ npm run test", "✓ 128 tests superados", "$ npm run deploy", "✓ En producción · 42 s"],
    arch: "Arquitectura",
    nodes: ["Apps", "Web", "API", "Auth", "Datos", "Pagos"],
    badges: ["HTTPS · datos cifrados", "Tests automáticos ✓", "Despliegue continuo"],
  },
  ai: {
    core: "Juko AI",
    online: "En línea",
    nodes: ["WhatsApp", "Web", "Reservas", "Facturas", "CRM", "Email"],
    feed: "Ejemplo en vivo",
    msgs: [
      { who: "Cliente", text: "¿Tienen cita mañana a las 10?", ai: false },
      { who: "Agente IA", text: "Sí: 10:30 reservada ✓", ai: true },
      { who: "Automatización", text: "Factura #1042 enviada ✓", ai: true },
      { who: "Agente IA", text: "Nuevo cliente calificado ✓", ai: true },
    ],
    chips: ["Solo si la pides", "A la medida de tu producto"],
  },
  launch: {
    url: "tunegocio.com",
    live: "En vivo",
    brand: "TU NEGOCIO",
    nav: "Inicio · Servicios · Contacto",
    title: ["Tu idea.", "Ya en vivo."],
    sub: "Una web y una app que trabajan por ti.",
    cta: "Empezar ahora ↗",
    stores: ["App Store", "Google Play"],
    published: "Publicada ✓",
    toasts: [["Nueva reserva", "Mañana · 10:30"], ["Pago recibido", "Corte y barba"], ["Reseña 5★", "“¡Súper fácil!”"]],
    growth: "reservas este mes",
    kpis: [
      { label: "Usuarios", to: 1240, dec: 0, suffix: "" },
      { label: "Conversión", to: 4.8, dec: 1, suffix: "%" },
      { label: "Valoración", to: 4.9, dec: 1, suffix: "★" },
    ],
  },
};
type HoloCopy = typeof ES;

const EN: HoloCopy = {
  bar: "Juko · pipeline",
  status: ["Analysing", "Designing", "Building", "Tailor-made", "Live"],
  idea: {
    session: "Discovery session",
    chat: [
      { who: "You", text: "I want an app so my customers can book." },
      { who: "Juko", text: "Great. Let's shape your idea together." },
    ],
    core: "Your idea",
    analysing: "AI analysing",
    nodes: ["Bookings", "Online payments", "Admin panel", "AI agent"],
    brief: "Project brief",
    briefRows: ["Goal · online bookings", "Users · customers and staff", "Platforms · iOS, Android and web"],
    plan: "Project plan",
    phases: ["Design", "Development", "AI", "Launch"],
    chips: ["Scope ✓", "Plan ✓", "Budget ✓"],
  },
  design: {
    system: "Design system",
    color: "Colour",
    type: "Typography",
    scale: [["Display", "32"], ["Heading", "24"], ["Body", "15"]],
    spacing: "Spacing",
    layers: "Layers",
    layerRows: ["Header", "Booking card", "Services", "Main button"],
    proto: "Clickable prototype",
    comps: "Components",
    compRows: ["Book now", "Card", "Search…"],
    cursor: "Designer",
  },
  app: { hi: "Hi, Anna", next: "Your next visit", when: "Tomorrow · 10:30", rows: ["Cut & beard", "Manicure", "Relax massage"], cta: "Book now" },
  build: {
    tabs: ["booking.ts", "api.ts"],
    code: [
      "export async function book(visit) {",
      "  const user = await auth.verify(visit.token)",
      "  const slot = await db.slots.lock(visit.time)",
      "  await payments.charge(user, visit.service)",
      '  await ai.notify(user, "Booking confirmed")',
      "  return { ok: true, slot }",
      "}",
    ],
    term: ["$ npm run test", "✓ 128 tests passed", "$ npm run deploy", "✓ Live in production · 42 s"],
    arch: "Architecture",
    nodes: ["Apps", "Web", "API", "Auth", "Data", "Payments"],
    badges: ["HTTPS · encrypted data", "Automated tests ✓", "Continuous delivery"],
  },
  ai: {
    core: "Juko AI",
    online: "Online",
    nodes: ["WhatsApp", "Web", "Bookings", "Invoices", "CRM", "Email"],
    feed: "Live example",
    msgs: [
      { who: "Customer", text: "Any slot tomorrow at 10?", ai: false },
      { who: "AI agent", text: "Yes: 10:30 booked ✓", ai: true },
      { who: "Automation", text: "Invoice #1042 sent ✓", ai: true },
      { who: "AI agent", text: "New lead qualified ✓", ai: true },
    ],
    chips: ["Only if you ask", "Tailored to your product"],
  },
  launch: {
    url: "yourbusiness.com",
    live: "Live",
    brand: "YOUR BUSINESS",
    nav: "Home · Services · Contact",
    title: ["Your idea.", "Now live."],
    sub: "A website and an app that work for you.",
    cta: "Get started ↗",
    stores: ["App Store", "Google Play"],
    published: "Published ✓",
    toasts: [["New booking", "Tomorrow · 10:30"], ["Payment received", "Cut & beard"], ["5★ review", "“So easy!”"]],
    growth: "bookings this month",
    kpis: [
      { label: "Users", to: 1240, dec: 0, suffix: "" },
      { label: "Conversion", to: 4.8, dec: 1, suffix: "%" },
      { label: "Rating", to: 4.9, dec: 1, suffix: "★" },
    ],
  },
};

/* ---------- scroll-scrubbed building blocks ---------- */

// 0 → 1 while p runs from a to b
function useSpan(p: P, [a, b]: Span) {
  return useTransform(p, (v) => clamp01((v - a) / (b - a)));
}

function Appear({ p, at, className, style, children, dx = 0, dy = 10 }: { p: P; at: Span; className?: string; style?: CSSProperties; children?: ReactNode; dx?: number; dy?: number }) {
  const k = useSpan(p, at);
  const x = useTransform(k, (v) => (1 - v) * dx);
  const y = useTransform(k, (v) => (1 - v) * dy);
  return <motion.div className={className} style={{ ...style, opacity: k, x, y }}>{children}</motion.div>;
}

// a line that draws itself, then carries a flow of light
function Draw({ p, at, d, mint }: { p: P; at: Span; d: string; mint?: boolean }) {
  const k = useSpan(p, at);
  const shown = useTransform(k, (v) => (v > 0 ? 1 : 0));
  const flow = useTransform(k, (v) => (v > 0.98 ? 1 : 0));
  return (
    <g className={mint ? "hl-mint" : undefined}>
      <motion.path d={d} className="hl-wire" style={{ pathLength: k, opacity: shown }} />
      <motion.path d={d} className="hl-flow" style={{ opacity: flow }} />
    </g>
  );
}

// text typed from left to right
function Typed({ p, at, children }: { p: P; at: Span; children: ReactNode }) {
  const k = useSpan(p, at);
  const clipPath = useTransform(k, (v) => `inset(-2px ${(1 - v) * 100}% -2px 0)`);
  return <motion.div style={{ clipPath }}>{children}</motion.div>;
}

function Grow({ p, at, className, style }: { p: P; at: Span; className: string; style?: CSSProperties }) {
  const k = useSpan(p, at);
  return <motion.i className={className} style={{ ...style, scaleX: k, originX: 0 }} />;
}

function Count({ p, at, to, dec = 0, prefix = "", suffix = "", locale }: { p: P; at: Span; to: number; dec?: number; prefix?: string; suffix?: string; locale: Locale }) {
  const k = useSpan(p, at);
  const text = useTransform(k, (v) => prefix + (to * v).toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix);
  return <motion.span>{text}</motion.span>;
}

// lit only while p is inside the span
function Lit({ p, at, className }: { p: P; at: Span; className: string }) {
  const o = useTransform(p, (v) => (v >= at[0] && v < at[1] ? 1 : 0));
  return <motion.i className={className} style={{ opacity: o }} />;
}

/* ---------- icons ---------- */

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7" strokeWidth="1.2" opacity=".45" /><path d="M5 8.2l2 2 4-4.4" /></svg>
);
const BulbIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3-.1 1.7-.8 3.2-.8s1.9.8 3.2.8c1.4 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.6-1-2.6-4.1zM14 5.3c.7-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z" /></svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24"><defs><linearGradient id="hl-play" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset=".5" stopColor="#60a5fa" /><stop offset="1" stopColor="#f472b6" /></linearGradient></defs><path d="M4 2.5l15 9.5-15 9.5z" fill="url(#hl-play)" /></svg>
);
const CursorIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.5l11 6.2-4.8 1.1L6 13.6z" /></svg>
);

/* ---------- the app screen, drawn twice in the design step: wireframe and final ---------- */

function AppScreen({ t, wire }: { t: HoloCopy["app"]; wire?: boolean }) {
  return (
    <div className={`hl-app${wire ? " hl-app--wire" : ""}`}>
      <div className="hl-app__status"><b>9:41</b><i /></div>
      <b className="hl-app__hi">{t.hi}</b>
      <div className="hl-app__card"><span>{t.next}</span><b>{t.when}</b><em>✓ OK</em></div>
      {t.rows.map((r, i) => <div className="hl-app__row" key={r}><i data-c={i} /><span>{r}</span><em /></div>)}
      <div className="hl-app__cta"><span>{t.cta}</span></div>
    </div>
  );
}

/* ---------- the five scenes ---------- */

type SceneProps = { p: P; c: HoloCopy; locale: Locale };

const IDEA_CORE = [500, 140] as const;
const IDEA_NODES: Array<[number, number]> = [[372, 58], [628, 58], [350, 272], [650, 272]];
const GANTT: Array<[number, number]> = [[0, 30], [24, 46], [56, 26], [80, 20]];

// An AI orb: a liquid core that swirls and breathes, a scanning ring and a few particles on tilted
// orbits, with its name in the middle. Step 01 thinks the idea over; step 04 is the AI itself.
function Orb({ variant, children }: { variant?: "ai"; children: ReactNode }) {
  return (
    <div className={`hl-orb${variant ? ` hl-orb--${variant}` : ""}`}>
      <i className="hl-orb__halo" />
      <svg className="hl-orb__rings" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" className="hl-orb__ticks" />
        <circle cx="100" cy="100" r="84" className="hl-orb__track" />
        <circle cx="100" cy="100" r="84" className="hl-orb__scan" />
      </svg>
      <div className="hl-orb__body">
        <i className="hl-orb__swirl" />
        <i className="hl-orb__swirl hl-orb__swirl--2" />
        <i className="hl-orb__light" />
        <i className="hl-orb__gloss" />
      </div>
      {[0, 1, 2].map((k) => (
        <span key={k} className={`hl-orb__orbit hl-orb__orbit--${k}`}><span><i /></span></span>
      ))}
      <div className="hl-orb__center">{children}</div>
    </div>
  );
}

// the idea in the orb, and below it how far the analysis has gone (scrubbed)
function IdeaOrb({ p, t, locale }: { p: P; t: HoloCopy["idea"]; locale: Locale }) {
  return (
    <>
      <Orb><BulbIcon /><b>{t.core}</b></Orb>
      <div className="hl-orb__status">
        <i className="hl-pulse" />{t.analysing} <Count p={p} at={[0.05, 0.85]} to={100} suffix="%" locale={locale} />
      </div>
    </>
  );
}

function IdeaScene({ p, c, locale }: SceneProps) {
  const t = c.idea;
  return (
    <>
      <div className="hl-panel" style={{ left: 20, top: 18, width: 262, height: 160 }}>
        <span className="hl-label">{t.session}</span>
        <Appear p={p} at={[0, 0.12]} className="hl-bubble hl-bubble--you"><b>{t.chat[0].who}</b>{t.chat[0].text}</Appear>
        <Appear p={p} at={[0.14, 0.26]} className="hl-bubble hl-bubble--us"><b>{t.chat[1].who}</b>{t.chat[1].text}</Appear>
      </div>
      <div className="hl-panel" style={{ left: 20, top: 192, width: 262, height: 150 }}>
        <span className="hl-label">{t.brief}</span>
        {t.briefRows.map((r, i) => (
          <Appear key={r} p={p} at={[0.4 + i * 0.08, 0.5 + i * 0.08]} className="hl-check" dx={-10} dy={0}><CheckIcon />{r}</Appear>
        ))}
      </div>
      <div className="hl-chips" style={{ left: 20, top: 360, width: 262 }}>
        {t.chips.map((ch, i) => <Appear key={ch} p={p} at={[0.8 + i * 0.05, 0.9 + i * 0.05]} className="hl-chip hl-chip--ok">{ch}</Appear>)}
      </div>

      <svg className="hl-svg" width={W} height={492} viewBox={`0 0 ${W} 492`}>
        {IDEA_NODES.map(([x, y], i) => (
          <Draw key={i} p={p} at={[0.12 + i * 0.06, 0.3 + i * 0.06]} d={`M${x} ${y} L${IDEA_CORE[0]} ${IDEA_CORE[1]}`} />
        ))}
      </svg>
      <div className="hl-at" style={{ left: IDEA_CORE[0], top: IDEA_CORE[1] }}>
        <IdeaOrb p={p} t={t} locale={locale} />
      </div>
      {t.nodes.map((n, i) => (
        <div key={n} className="hl-at" style={{ left: IDEA_NODES[i][0], top: IDEA_NODES[i][1] }}>
          <Appear p={p} at={[0.24 + i * 0.06, 0.34 + i * 0.06]} className="hl-node" dy={6}><i />{n}</Appear>
        </div>
      ))}

      <div className="hl-panel" style={{ left: 300, top: 300, width: 400, height: 172 }}>
        <span className="hl-label">{t.plan}</span>
        {t.phases.map((ph, i) => (
          <div className="hl-gantt" key={ph}>
            <span>{ph}</span>
            <div className="hl-gantt__track">
              <Grow p={p} at={[0.5 + i * 0.08, 0.66 + i * 0.08]} className="hl-gantt__bar" style={{ left: `${GANTT[i][0]}%`, width: `${GANTT[i][1]}%` }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const SWATCHES = ["#7752FE", "#8E8FFA", "#C2D9FF", "#5CE8A8"];

function DesignScene({ p, c }: SceneProps) {
  const t = c.design;
  // the scan that turns the wireframe into the final interface
  const scan = useSpan(p, [0.12, 0.7]);
  const finalClip = useTransform(scan, (v) => `inset(0 0 ${(1 - v) * 100}% 0)`);
  const wireClip = useTransform(scan, (v) => `inset(${v * 100}% 0 0 0)`);
  const scanTop = useTransform(scan, (v) => `${v * 100}%`);
  const scanOn = useTransform(scan, (v) => (v > 0.002 && v < 0.998 ? 1 : 0));
  const band = (i: number): Span => [0.12 + i * 0.145, 0.12 + (i + 1) * 0.145];
  return (
    <>
      <div className="hl-panel" style={{ left: 20, top: 18, width: 210, height: 456 }}>
        <span className="hl-label">{t.system}</span>
        <span className="hl-sub">{t.color}</span>
        <div className="hl-swatches">
          {SWATCHES.map((s, i) => (
            <Appear key={s} p={p} at={[0.02 + i * 0.04, 0.12 + i * 0.04]} className="hl-swatch" dy={6}><i style={{ background: s }} />{s}</Appear>
          ))}
        </div>
        <span className="hl-sub">{t.type}</span>
        <Appear p={p} at={[0.18, 0.28]} className="hl-type"><b>Aa</b><span>Space Grotesk<br />600 · 500</span></Appear>
        {t.scale.map(([name, size], i) => (
          <Appear key={name} p={p} at={[0.24 + i * 0.05, 0.32 + i * 0.05]} className="hl-scale" dy={0} dx={-8}>
            <span style={{ fontSize: 8 + Number(size) / 4 }}>{name}</span><em>{size}px</em>
          </Appear>
        ))}
        <span className="hl-sub">{t.spacing}</span>
        {[4, 8, 16, 24, 32].map((s, i) => (
          <Appear key={s} p={p} at={[0.36 + i * 0.04, 0.44 + i * 0.04]} className="hl-space" dy={0}><i style={{ width: s * 3 }} />{s}</Appear>
        ))}
      </div>

      <Appear p={p} at={[0, 0.1]} className="hl-dim hl-dim--h" style={{ left: 262, top: 14, width: 200 }}><span>390</span></Appear>
      <Appear p={p} at={[0, 0.1]} className="hl-dim hl-dim--v" style={{ left: 244, top: 30, height: 412 }}><span>844</span></Appear>
      <div className="hl-phone" style={{ left: 262, top: 30, width: 200, height: 412, fontSize: 9.4 }}>
        <div className="hl-phone__screen">
          <motion.div className="hl-layer" style={{ clipPath: wireClip }}><AppScreen t={c.app} wire /></motion.div>
          <motion.div className="hl-layer" style={{ clipPath: finalClip }}><AppScreen t={c.app} /></motion.div>
          <motion.i className="hl-scanline" style={{ top: scanTop, opacity: scanOn }} />
        </div>
      </div>
      <div className="hl-cursor"><CursorIcon /><span>{t.cursor}</span></div>

      <div className="hl-panel" style={{ left: 486, top: 18, width: 214, height: 196 }}>
        <span className="hl-label">{t.layers}</span>
        {t.layerRows.map((r, i) => (
          <div className="hl-layer-row" key={r}>
            <Lit p={p} at={band(i)} className="hl-layer-row__hl" />
            <i className="hl-layer-row__icon" />
            <span>{r}</span>
          </div>
        ))}
      </div>
      <Appear p={p} at={[0.6, 0.74]} className="hl-panel" style={{ left: 486, top: 226, width: 214, height: 140 }}>
        <span className="hl-label">{t.proto}</span>
        <div className="hl-proto">
          <svg className="hl-svg" width="186" height="84" viewBox="0 0 186 84">
            <path d="M46 40 H74" className="hl-flow" />
            <path d="M122 40 H150" className="hl-flow" />
          </svg>
          {[0, 1, 2].map((k) => <div key={k} className="hl-mini" style={{ left: k * 70 }}><i /><i /><i /><i /></div>)}
        </div>
      </Appear>
      <div className="hl-panel" style={{ left: 486, top: 378, width: 214, height: 96 }}>
        <span className="hl-label">{t.comps}</span>
        <div className="hl-comps">
          <Appear p={p} at={[0.74, 0.84]} className="hl-comp hl-comp--btn" dy={6}>{t.compRows[0]}</Appear>
          <Appear p={p} at={[0.8, 0.9]} className="hl-comp hl-comp--card" dy={6}>{t.compRows[1]}</Appear>
          <Appear p={p} at={[0.86, 0.96]} className="hl-comp hl-comp--input" dy={6}>{t.compRows[2]}</Appear>
        </div>
      </div>
    </>
  );
}

// a light syntax colouring for the code on screen
function CodeLine({ line }: { line: string }) {
  const parts = line.split(/("[^"]*"|\s+|[(){}.,:])/).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        const cls = /^(export|async|function|const|await|return|true)$/.test(part)
          ? "k"
          : part.startsWith('"')
            ? "s"
            : /^[(){}.,:]$/.test(part)
              ? "p"
              : parts[i - 1] === "."
                ? "m"
                : undefined;
        return <span key={i} className={cls}>{part}</span>;
      })}
    </>
  );
}

// the architecture diagram, in the panel's own frame
const ARCH: Array<[number, number, number]> = [[56, 74, 86], [162, 74, 86], [109, 170, 110], [40, 266, 66], [109, 266, 66], [178, 266, 66]];
const ARCH_LINKS: Array<[number, number]> = [[0, 2], [1, 2], [2, 3], [2, 4], [2, 5]];

function BuildScene({ p, c }: SceneProps) {
  const t = c.build;
  const line = 0.075;
  return (
    <>
      <div className="hl-win" style={{ left: 20, top: 16, width: 440, height: 286 }}>
        <div className="hl-win__bar">
          <span className="hl-dots"><i /><i /><i /></span>
          {t.tabs.map((tab, i) => <span key={tab} className={`hl-tab${i ? "" : " is-on"}`}>{tab}</span>)}
        </div>
        <div className="hl-code">
          {t.code.map((l, i) => (
            <div className="hl-code__row" key={i}>
              <span className="hl-code__n">{i + 1}</span>
              <Typed p={p} at={[0.04 + i * line, 0.04 + (i + 1) * line]}><CodeLine line={l} /></Typed>
            </div>
          ))}
        </div>
      </div>
      <div className="hl-win" style={{ left: 20, top: 316, width: 440, height: 158 }}>
        <div className="hl-win__bar"><span className="hl-dots"><i /><i /><i /></span><span className="hl-tab">terminal</span></div>
        <div className="hl-term">
          {t.term.map((l, i) => (
            <Appear key={l} p={p} at={[0.58 + i * 0.08, 0.64 + i * 0.08]} className={l.startsWith("✓") ? "ok" : undefined} dy={6}>
              {l}{i === 3 && <i className="hl-pulse" />}
            </Appear>
          ))}
        </div>
      </div>
      <div className="hl-panel" style={{ left: 480, top: 16, width: 220, height: 458 }}>
        <span className="hl-label">{t.arch}</span>
        <div className="hl-arch">
          <svg className="hl-svg" width="192" height="300" viewBox="0 0 192 300">
            {ARCH_LINKS.map(([a, b], i) => (
              <Draw key={i} p={p} at={[0.14 + i * 0.07, 0.26 + i * 0.07]} d={`M${ARCH[a][0] - 14} ${ARCH[a][1] - 36} L${ARCH[b][0] - 14} ${ARCH[b][1] - 36}`} />
            ))}
          </svg>
          {t.nodes.map((n, i) => (
            <div key={n} className="hl-at" style={{ left: ARCH[i][0] - 14, top: ARCH[i][1] - 36 }}>
              <Appear p={p} at={[0.06 + i * 0.07, 0.16 + i * 0.07]} className="hl-node hl-node--sm" style={{ width: ARCH[i][2] }} dy={6}><i />{n}</Appear>
            </div>
          ))}
        </div>
        <div className="hl-stack">
          {t.badges.map((b, i) => <Appear key={b} p={p} at={[0.82 + i * 0.05, 0.92 + i * 0.05]} className="hl-chip hl-chip--ok" dx={-8} dy={0}>{b}</Appear>)}
        </div>
      </div>
    </>
  );
}

const AI_CORE = [250, 236] as const;
const AI_NODES = [-90, -30, 30, 90, 150, 210].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [AI_CORE[0] + Math.cos(a) * 192, AI_CORE[1] + Math.sin(a) * 170] as const;
});

function AiPacket({ p, at, i }: { p: P; at: Span; i: number }) {
  const k = useSpan(p, at);
  const on = useTransform(k, (v) => (v > 0.98 ? 1 : 0));
  const [x, y] = AI_NODES[i];
  // even channels feed the core, odd ones receive from it
  const path = i % 2 ? `M${AI_CORE[0]} ${AI_CORE[1]} L${x} ${y}` : `M${x} ${y} L${AI_CORE[0]} ${AI_CORE[1]}`;
  return (
    <motion.g style={{ opacity: on }}>
      <circle r="3.2" className="hl-packet">
        <animateMotion dur="2.2s" begin={`${i * 0.37}s`} repeatCount="indefinite" path={path} />
      </circle>
    </motion.g>
  );
}

function AiScene({ p, c }: SceneProps) {
  const t = c.ai;
  return (
    <>
      <svg className="hl-svg" width="500" height="492" viewBox="0 0 500 492">
        <ellipse cx={AI_CORE[0]} cy={AI_CORE[1]} rx="192" ry="170" className="hl-orbit" />
        {AI_NODES.map(([x, y], i) => (
          <Draw key={i} p={p} at={[0.04 + i * 0.045, 0.18 + i * 0.045]} d={`M${AI_CORE[0]} ${AI_CORE[1]} L${x} ${y}`} />
        ))}
        {AI_NODES.map((_, i) => <AiPacket key={i} p={p} at={[0.04 + i * 0.045, 0.18 + i * 0.045]} i={i} />)}
      </svg>
      <div className="hl-at" style={{ left: AI_CORE[0], top: AI_CORE[1] }}>
        <Orb variant="ai"><b>{t.core}</b><small><i className="hl-pulse" />{t.online}</small></Orb>
      </div>
      {t.nodes.map((n, i) => (
        <div key={n} className="hl-at" style={{ left: AI_NODES[i][0], top: AI_NODES[i][1] }}>
          <Appear p={p} at={[0.12 + i * 0.045, 0.22 + i * 0.045]} className="hl-node" dy={6}><i />{n}</Appear>
        </div>
      ))}
      <div className="hl-panel" style={{ left: 500, top: 16, width: 200, height: 384 }}>
        <span className="hl-label">{t.feed}<i className="hl-pulse" /></span>
        {t.msgs.map((m, i) => (
          <Appear key={m.text} p={p} at={[0.3 + i * 0.13, 0.4 + i * 0.13]} className={`hl-msg${m.ai ? " is-ai" : ""}`} dx={14} dy={0}>
            <i>{m.ai ? "AI" : m.who[0]}</i>
            <div><b>{m.who}</b><span>{m.text}</span></div>
          </Appear>
        ))}
      </div>
      <div className="hl-stack" style={{ position: "absolute", left: 500, top: 414, width: 200 }}>
        {t.chips.map((ch, i) => <Appear key={ch} p={p} at={[0.84 + i * 0.06, 0.94 + i * 0.06]} className="hl-chip" dx={10} dy={0}>{ch}</Appear>)}
      </div>
    </>
  );
}

const CHART = "M0 80 C24 78 40 70 62 66 S100 62 124 50 S160 44 182 30 S222 14 248 8";

function LaunchScene({ p, c, locale }: SceneProps) {
  const t = c.launch;
  const area = useTransform(useSpan(p, [0.5, 0.85]), (v) => v * 0.9);
  return (
    <>
      <div className="hl-win" style={{ left: 20, top: 16, width: 390, height: 256 }}>
        <div className="hl-win__bar">
          <span className="hl-dots"><i /><i /><i /></span>
          <span className="hl-url"><LockIcon />{t.url}</span>
          <Appear p={p} at={[0.14, 0.24]} className="hl-badge-live" dy={0}>{t.live}</Appear>
        </div>
        <Grow p={p} at={[0, 0.16]} className="hl-deploy" />
        <div className="hl-site">
          <nav><b>{t.brand}</b><span>{t.nav}</span></nav>
          <div>
            <h4>{t.title[0]}<em>{t.title[1]}</em></h4>
            <p>{t.sub}</p>
            <span className="hl-site__cta">{t.cta}</span>
          </div>
          <div className="hl-site__art"><div className="hl-site__phone"><i /><i /><i /><i /></div></div>
        </div>
      </div>
      <div className="hl-stores" style={{ left: 20, top: 286, width: 390 }}>
        {t.stores.map((s, i) => (
          <Appear key={s} p={p} at={[0.2 + i * 0.08, 0.32 + i * 0.08]} className="hl-store" dy={8}>
            {i ? <PlayIcon /> : <AppleIcon />}
            <div><small>{t.published}</small><b>{s}</b></div>
          </Appear>
        ))}
      </div>
      <div className="hl-kpis" style={{ left: 20, top: 356, width: 390 }}>
        {t.kpis.map((k) => (
          <div className="hl-kpi" key={k.label}>
            <span>{k.label}</span>
            <b><Count p={p} at={[0.4, 0.8]} to={k.to} dec={k.dec} suffix={k.suffix} locale={locale} /></b>
          </div>
        ))}
      </div>

      <div className="hl-phone" style={{ left: 426, top: 16, width: 140, height: 288, fontSize: 6.5 }}>
        <div className="hl-phone__screen"><div className="hl-layer"><AppScreen t={c.app} /></div></div>
      </div>
      <div style={{ position: "absolute", left: 578, top: 24, width: 122 }}>
        {t.toasts.map(([title, sub], i) => (
          <Appear key={title} p={p} at={[0.3 + i * 0.12, 0.4 + i * 0.12]} className="hl-toast" dx={16} dy={0}>
            <i />
            <div><b>{title}</b><span>{sub}</span></div>
          </Appear>
        ))}
      </div>
      <div className="hl-panel hl-chart" style={{ left: 426, top: 318, width: 274, height: 156 }}>
        <b><Count p={p} at={[0.45, 0.85]} to={38} prefix="+" suffix="%" locale={locale} /></b>
        <span>{t.growth}</span>
        <svg className="hl-svg" style={{ left: 13, top: 58 }} width="248" height="88" viewBox="0 0 248 88">
          <defs>
            <linearGradient id="hl-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5CE8A8" stopOpacity=".35" />
              <stop offset="1" stopColor="#5CE8A8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path d={`${CHART} L248 88 L0 88 Z`} fill="url(#hl-area)" style={{ opacity: area }} />
          <Draw p={p} at={[0.45, 0.85]} d={CHART} mint />
        </svg>
      </div>
    </>
  );
}

function Scene({ step, tour, c, locale }: { step: number; tour: P; c: HoloCopy; locale: Locale }) {
  // the step's own progress: it starts once the step is on and finishes a little before the next one
  const start = step === 0 ? 0.25 : 0.06;
  const p = useTransform(tour, (v) => clamp01((v * 5 - step - start) / (0.84 - start)));
  switch (step) {
    case 0:
      return <IdeaScene p={p} c={c} locale={locale} />;
    case 1:
      return <DesignScene p={p} c={c} locale={locale} />;
    case 2:
      return <BuildScene p={p} c={c} locale={locale} />;
    case 3:
      return <AiScene p={p} c={c} locale={locale} />;
    default:
      return <LaunchScene p={p} c={c} locale={locale} />;
  }
}

function Seg({ tour, i }: { tour: P; i: number }) {
  const k = useTransform(tour, (v) => clamp01(v * 5 - i));
  return <i><motion.b style={{ scaleX: k, originX: 0 }} /></i>;
}

/* ---------- the console ---------- */

function Console({ step, tour, c, title, locale }: { step: number; tour: P; c: HoloCopy; title: string; locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  // a blur over the whole console is a heavy frame on a phone; there the scenes only fade
  const soft = !useLiteMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // the observer also fires once on observe, which gives the first size
    const ro = new ResizeObserver(() => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setScale(Math.max(0.1, Math.min(w / W, h / H, 1.2)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="holo__viz" ref={ref} aria-hidden="true">
      <div className="holo__fit" style={{ width: W * scale, height: H * scale, visibility: scale ? "visible" : "hidden" }}>
        <div className="holo__board" style={{ transform: `scale(${scale})` }}>
          <header className="holo__bar">
            <span className="holo__brand"><i className="holo__led" />{c.bar}</span>
            <span className="holo__now">{String(step + 1).padStart(2, "0")} / 05 · {title}</span>
            <span className="holo__state">{c.status[step]}</span>
            <span className="holo__segs">{[0, 1, 2, 3, 4].map((i) => <Seg key={i} tour={tour} i={i} />)}</span>
          </header>
          <div className="holo__view">
            <AnimatePresence initial={false}>
              <motion.div
                key={step}
                className="holo__scene"
                initial={{ opacity: 0, scale: 0.97, ...(soft && { filter: "blur(10px)" }) }}
                animate={{ opacity: 1, scale: 1, ...(soft && { filter: "blur(0px)" }) }}
                exit={{ opacity: 0, scale: 1.02, ...(soft && { filter: "blur(10px)" }) }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <Scene step={step} tour={tour} c={c} locale={locale} />
              </motion.div>
            </AnimatePresence>
            <i key={`sweep-${step}`} className="holo__sweep" />
          </div>
          <i className="holo__corner holo__corner--tl" />
          <i className="holo__corner holo__corner--tr" />
          <i className="holo__corner holo__corner--bl" />
          <i className="holo__corner holo__corner--br" />
        </div>
      </div>
    </div>
  );
}

export function ProcessHolo({ locale }: { locale: Locale }) {
  const m = getDict(locale).manifesto;
  const c = locale === "en" ? EN : ES;
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const { scrollYProgress: tour } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(tour, "change", (v) => setActive(v < 0.04 ? -1 : Math.min(4, Math.floor(v * 5))));

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + run * ((i + 0.6) / 5), behavior: "smooth" });
  };
  const shown = Math.max(0, active);

  return (
    <section className="holo-section" aria-label={m.title}>
      <div className="holo" ref={ref}>
        <div className="howto__stage holo__stage">
          <div className="holo__bg" aria-hidden="true" />
          <Console step={shown} tour={tour} c={c} title={m.steps[shown].t} locale={locale} />

          <div className="howto__copy">
            <span className="eyebrow">{m.eyebrow}</span>
            <h2 className="howto__title">{m.title}</h2>
            <ol className="howto__steps">
              {m.steps.map((s, i) => (
                <li key={s.t} className={`howto__step${active === i ? " is-active" : ""}${active > i ? " is-done" : ""}`}>
                  <button type="button" onClick={() => goTo(i)}>
                    <span className="howto__num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="howto__text">
                      <b>{s.t}</b>
                      <span>{s.d}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="howto__hint" aria-hidden="true"><i /> {m.hint}</p>
          </div>

          {/* phones: the current step under the console */}
          <div className="howto__card" aria-hidden="true">
            <div className="howto__dots">
              {m.steps.map((s, i) => <i key={s.t} className={i === active ? "is-on" : i < active ? "is-done" : ""} />)}
            </div>
            <span className="howto__num">{String(shown + 1).padStart(2, "0")} / 05</span>
            <b>{m.steps[shown].t}</b>
            <span>{m.steps[shown].d}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
