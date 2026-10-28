"use client";

import { useEffect, useRef } from "react";

/*
 * Lightweight 2D take on the WebGL particle scenes of the real sites:
 *  - "pole"  → NOIR's barber pole (brass / pole-red / cream spiral)
 *  - "globe" → NEO APP's golden dotted globe
 * Points are generated deterministically, rotated in 3D and projected.
 * It only animates while visible and draws a single still frame for reduced motion.
 */

type P = { x: number; y: number; z: number; c: string; s: number };

function rnd(n: number) {
  const x = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
}

function pole(): P[] {
  const pts: P[] = [];
  const cols = ["#B83A2B", "#F3EDE2", "#C8A15A"];
  for (let i = 0; i < 3200; i++) {
    const t = rnd(i) * Math.PI * 2;
    const y = (rnd(i + 5000) - 0.5) * 2.3;
    const r = 0.27 + (rnd(i + 9000) - 0.5) * 0.02;
    // diagonal spiral stripes, as on a barber pole
    const band = Math.floor((((t / (Math.PI * 2)) + y * 0.9 + 10) * 3) % 3);
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, c: cols[band], s: 1.4 + rnd(i + 3) * 1.4 });
  }
  // brass caps
  for (const cy of [-1.24, 1.24]) {
    for (let i = 0; i < 380; i++) {
      const t = rnd(i + 20000 + cy * 100) * Math.PI * 2;
      const r = 0.34 * Math.sqrt(rnd(i + 21000 + cy * 100));
      pts.push({ x: Math.cos(t) * r, y: cy + (rnd(i + 22000) - 0.5) * 0.12, z: Math.sin(t) * r, c: "#C8A15A", s: 1.6 });
    }
  }
  // dust
  for (let i = 0; i < 420; i++) {
    pts.push({ x: (rnd(i + 30000) - 0.5) * 3.2, y: (rnd(i + 31000) - 0.5) * 3, z: (rnd(i + 32000) - 0.5) * 2, c: "#C8A15A", s: 0.9 });
  }
  return pts;
}

function globe(): P[] {
  const pts: P[] = [];
  const n = 1500;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, c: "#D4A72C", s: 1.5 });
  }
  // meridians and parallels
  for (let m = 0; m < 12; m++) {
    const a = (m / 12) * Math.PI;
    for (let k = 0; k < 90; k++) {
      const t = (k / 90) * Math.PI * 2;
      pts.push({ x: Math.cos(t) * Math.cos(a), y: Math.sin(t), z: Math.cos(t) * Math.sin(a), c: "#8C6A1C", s: 0.9 });
    }
  }
  for (const lat of [-0.6, -0.3, 0, 0.3, 0.6]) {
    const r = Math.sqrt(1 - lat * lat);
    for (let k = 0; k < 120; k++) {
      const t = (k / 120) * Math.PI * 2;
      pts.push({ x: Math.cos(t) * r, y: lat, z: Math.sin(t) * r, c: "#8C6A1C", s: 0.9 });
    }
  }
  // satellites
  for (let i = 0; i < 26; i++) {
    const t = rnd(i + 40000) * Math.PI * 2;
    const y = (rnd(i + 41000) - 0.5) * 1.6;
    const r = 1.08;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, c: "#FFE7A3", s: 3.2 });
  }
  return pts;
}

export function ParticleField({ shape, width, height, className = "" }: { shape: "pole" | "globe"; width: number; height: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = 1.5;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const pts = shape === "pole" ? pole() : globe();
    const scale = shape === "pole" ? Math.min(width, height) * 0.36 : Math.min(width, height) * 0.4;
    const tiltX = shape === "pole" ? -0.18 : 0.32;
    const tiltZ = shape === "pole" ? 0.32 : 0;
    const cx = width / 2;
    const cy = height / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let angle = 0.6;
    let raf = 0;
    let last = 0;
    let visible = false;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const cx1 = Math.cos(tiltX), sx1 = Math.sin(tiltX);
      const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
      for (const p of pts) {
        // spin around Y, tilt around X then Z
        const x = p.x * ca + p.z * sa;
        const z = -p.x * sa + p.z * ca;
        const y = p.y * cx1 - z * sx1;
        const z2 = p.y * sx1 + z * cx1;
        const xr = x * cz - y * sz;
        const yr = x * sz + y * cz;
        const persp = 3 / (3 + z2);
        const depth = (z2 + 1.4) / 2.8;
        const alpha = shape === "globe" ? 0.18 + (1 - depth) * 0.82 : 0.25 + (1 - depth) * 0.75;
        ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
        ctx.fillStyle = p.c;
        const s = p.s * persp;
        ctx.fillRect(cx + xr * scale * persp - s / 2, cy + yr * scale * persp - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      angle += dt * (shape === "pole" ? 0.55 : 0.22);
      draw();
      if (visible) raf = requestAnimationFrame(loop);
    };

    draw();
    if (reduce) return;

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { last = 0; raf = requestAnimationFrame(loop); }
      else cancelAnimationFrame(raf);
    });
    io.observe(canvas);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [shape, width, height]);

  return <canvas ref={ref} className={className} style={{ width, height }} />;
}
