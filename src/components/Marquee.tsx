"use client";

import { motion, useReducedMotion } from "framer-motion";

const ITEMS = ["Angular", "Flutter", "Node.js", "Python", "AWS", "Firebase", "AI Agents", "Automatización", ".NET", "React", "PostgreSQL", "CI/CD"];

export function Marquee() {
  const reduce = useReducedMotion();
  const row = [...ITEMS, ...ITEMS];

  return (
    <section className="marquee" aria-hidden="true">
      <motion.div
        className="marquee__track"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {row.map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "2.2rem" }}>
            {item}
            <i>·</i>
          </span>
        ))}
      </motion.div>
    </section>
  );
}
