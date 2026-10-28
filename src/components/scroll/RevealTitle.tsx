"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

/* A headline whose words rise from behind a line mask as it enters the viewport. */
export function RevealTitle({
  text,
  as = "h2",
  className,
  delay = 0,
  accentFrom,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  /** words from this index on get the accent style (rt-word--accent) */
  accentFrom?: number;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  const words = text.split(" ");

  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ staggerChildren: 0.07, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className={`rt-word${accentFrom !== undefined && i >= accentFrom ? " rt-word--accent" : ""}`}>
            <motion.span
              className="rt-word__in"
              variants={{ hidden: { y: "108%", rotate: 4 }, show: { y: "0%", rotate: 0, transition: { duration: 0.95, ease } } }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
