"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { PROJECTS, domainOf, type Category, type Project } from "@/lib/content";
import { getDict, type Locale } from "@/lib/i18n";
import { ArrowUpRight } from "./icons";
import { BrowserFrame, PhoneFrame } from "./work/Devices";
import { visualOf } from "./work/visuals";
import { PlatformList, StoreBadge } from "./work/Stores";
import { ramp } from "./scroll/ramp";

function Card({ project, locale, y }: { project: Project; locale: Locale; y?: MotionValue<string> }) {
  const dict = getDict(locale);
  const href = `/${locale}/proyectos/${project.slug}`;
  const visual = visualOf(project.slug);
  const domain = visual.domain === null ? undefined : visual.domain ?? domainOf(project);

  return (
    <motion.article
      layout={!y}
      className={`wcard${visual.desktop ? "" : " wcard--app"}`}
      style={{ "--accent": project.accent, ...(y ? { y } : {}) } as CSSProperties}
      // A drifting card owns its y through the scroll, so it only fades in.
      initial={y ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={y ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={y ? { opacity: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={href} className="wcard__stage" aria-label={`${dict.work.caseStudy} · ${project.title}`}>
        <span className="stage-grid" aria-hidden="true" />
        <span className="wcard__cat">{project.cat === "Mobile" ? dict.work.mobile : project.cat}</span>
        {visual.desktop ? (
          <>
            <BrowserFrame domain={domain} className="wcard__browser">{visual.desktop}</BrowserFrame>
            {visual.phones[0] && <PhoneFrame className="wcard__phone">{visual.phones[0].node}</PhoneFrame>}
          </>
        ) : (
          <div className={`wcard__phones wcard__phones--${Math.min(visual.phones.length, 3)}`}>
            {visual.phones.slice(0, 3).map((p, i) => (
              <PhoneFrame key={p.key} className={`wcard__fan wcard__fan--${i}`}>{p.node}</PhoneFrame>
            ))}
          </div>
        )}
      </Link>

      <div className="wcard__body">
        <div className="wcard__meta">
          <span>{project.sector[locale]}</span>
          <i aria-hidden="true" />
          <span>{project.location[locale]}</span>
        </div>
        <h3 className="wcard__title">{project.title}</h3>
        <p className="wcard__tagline">{project.tagline[locale]}</p>
        <p className="wcard__desc">{project.desc[locale]}</p>
        <div className="wcard__tech">
          {project.tech.slice(0, 4).map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="wcard__foot">
          <PlatformList platforms={project.platforms} />
          <div className="wcard__links">
            <Link href={href} className="project__link">{dict.work.caseStudy} <ArrowUpRight /></Link>
            {project.link && (
              <a href={project.link} target="_blank" rel="noopener noreferrer" className="project__link project__link--mute">
                {dict.work.visit} <ArrowUpRight />
              </a>
            )}
            {!project.link && project.stores?.map((s) => (
              <StoreBadge key={s.type} store={s} locale={locale} name={project.title} compact />
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function ProjectsGrid({
  locale,
  showFilters = true,
  items = PROJECTS,
  stagger = false,
}: {
  locale: Locale;
  showFilters?: boolean;
  items?: Project[];
  /** Columns drift at different speeds while the grid scrolls by (wide screens only). */
  stagger?: boolean;
}) {
  const dict = getDict(locale);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const cats: ("all" | Category)[] = ["all", "SaaS", "Web", "Mobile"];
  const label = (c: "all" | Category) => (c === "all" ? dict.work.all : c === "Mobile" ? dict.work.mobile : c);

  const visible = filter === "all" ? items : items.filter((p) => p.filters.includes(filter));

  const gridRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 981px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const { scrollYProgress } = useScroll({ target: gridRef, offset: ["start end", "end start"] });
  const ySlow = useTransform(scrollYProgress, (v) => `${ramp(0, 1, 4, -4)(v)}%`);
  const yFast = useTransform(scrollYProgress, (v) => `${ramp(0, 1, 14, -14)(v)}%`);
  const drift = stagger && wide && !reduce ? (i: number) => (i % 3 === 1 ? yFast : ySlow) : () => undefined;

  return (
    <>
      {showFilters && (
        <div className="filters" role="tablist" aria-label="Filtros">
          {cats.map((c) => (
            <button
              key={c}
              className={`filter${filter === c ? " is-active" : ""}`}
              onClick={() => setFilter(c)}
              role="tab"
              aria-selected={filter === c}
            >
              {label(c)}
            </button>
          ))}
        </div>
      )}
      <motion.div layout={!stagger} className="work-grid" ref={gridRef}>
        <AnimatePresence mode="popLayout">
          {visible.map((p, i) => <Card key={p.slug} project={p} locale={locale} y={drift(i)} />)}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
