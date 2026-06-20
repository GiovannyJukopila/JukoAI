"use client";

import { useEffect, useRef } from "react";

// star tints: mostly white/sky, a few brand violet — reads as a real starfield
const TINTS = [
  [226, 234, 255],
  [194, 217, 255],
  [255, 255, 255],
  [142, 143, 250],
];

type Star = { x: number; y: number; r: number; vx: number; vy: number; a: number; ph: number; tw: number; c: number[] };
type Meteor = { x: number; y: number; vx: number; vy: number; len: number; w: number; life: number; max: number };

const LINK = 116; // max distance for constellation links
const LINK2 = LINK * LINK;

export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // a soft starfield doesn't need full retina density — cap fill rate for cheaper paints
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let raf = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const spawnMeteor = (): Meteor => {
      const speed = rand(7, 12);
      const angle = rand(Math.PI * 0.62, Math.PI * 0.78); // fall down-left
      return {
        x: rand(w * 0.25, w * 1.05),
        y: rand(-h * 0.2, h * 0.12),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: rand(8, 14),
        w: rand(1.2, 2.2),
        life: 0,
        max: rand(70, 130),
      };
    };

    const build = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.round((w * h) / 22000));
      stars = Array.from({ length: count }, () => {
        const depth = rand(0.3, 1); // parallax depth
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(0.5, 1.6) * (0.6 + depth * 0.8),
          vx: rand(-0.05, 0.05) * depth,
          vy: rand(-0.08, 0.03) * depth,
          a: rand(0.25, 0.9) * (0.4 + depth * 0.6),
          ph: Math.random() * Math.PI * 2,
          tw: rand(0.6, 1.6),
          c: TINTS[Math.floor(Math.random() * TINTS.length)],
        };
      });
      meteors = [];
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // constellation links (faint, only near neighbours)
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            const alpha = (1 - d2 / LINK2) * 0.11;
            if (alpha < 0.012) continue;
            ctx.strokeStyle = `rgba(142,143,250,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // stars
      for (const s of stars) {
        if (!reduce) {
          s.x += s.vx; s.y += s.vy;
          if (s.y < -6) { s.y = h + 6; s.x = Math.random() * w; }
          else if (s.y > h + 6) s.y = -6;
          if (s.x < -6) s.x = w + 6;
          else if (s.x > w + 6) s.x = -6;
        }
        const twinkle = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.tw + s.ph);
        const [r, g, b] = s.c;
        // soft glow
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${s.a * twinkle * 0.22})`;
        ctx.arc(s.x, s.y, s.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${s.a * twinkle})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // falling meteors
      if (!reduce) {
        if (meteors.length < 2 && Math.random() < 0.012) meteors.push(spawnMeteor());
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.x += m.vx; m.y += m.vy; m.life++;
          const fade = Math.min(1, m.life / 12) * Math.max(0, 1 - m.life / m.max);
          const tx = m.x - m.vx * m.len;
          const ty = m.y - m.vy * m.len;
          const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
          grad.addColorStop(0, `rgba(214,228,255,${0.85 * fade})`);
          grad.addColorStop(0.4, `rgba(142,143,250,${0.35 * fade})`);
          grad.addColorStop(1, "rgba(142,143,250,0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = m.w;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = `rgba(230,238,255,${fade})`;
          ctx.arc(m.x, m.y, m.w * 0.9, 0, Math.PI * 2);
          ctx.fill();
          if (m.life > m.max || m.y > h + 40 || m.x < -40) meteors.splice(i, 1);
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    build();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(draw);

    let resizeT: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => { dpr = Math.min(window.devicePixelRatio || 1, 1.5); build(); }, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeT);
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
