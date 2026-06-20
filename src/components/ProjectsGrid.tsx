"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PROJECTS, type Category, type Project } from "@/lib/content";
import { getDict, type Locale } from "@/lib/i18n";
import { ArrowUpRight } from "./icons";

function Card({ project, locale }: { project: Project; locale: Locale }) {
  const dict = getDict(locale);
  return (
    <motion.article
      layout
      className={`project${project.featured ? " is-featured" : ""}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/${locale}/proyectos/${project.slug}`} className="project__media" aria-label={project.title}>
        <span className="project__cat">{project.cat}</span>
        <Image src={project.img} alt={project.title} fill sizes="(max-width: 900px) 100vw, 50vw" />
      </Link>
      <div className="project__body">
        <h3 className="project__title">{project.title}</h3>
        <p className="project__desc">{project.desc[locale]}</p>
        <div className="project__tech">
          {project.tech.map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="project__links">
          <Link href={`/${locale}/proyectos/${project.slug}`} className="project__link">
            {dict.work.caseStudy} <ArrowUpRight />
          </Link>
          {project.link && (
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="project__link">
              {dict.work.visit} <ArrowUpRight />
            </a>
          )}
          {project.stores?.map((s) => (
            <a key={s.type} href={s.url} target="_blank" rel="noopener noreferrer" className="project__store">{s.type}</a>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export function ProjectsGrid({
  locale,
  showFilters = true,
  items = PROJECTS,
  compact = false,
}: {
  locale: Locale;
  showFilters?: boolean;
  items?: Project[];
  compact?: boolean;
}) {
  const dict = getDict(locale);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const cats: ("all" | Category)[] = ["all", "SaaS", "Web", "Mobile"];
  const label = (c: "all" | Category) => (c === "all" ? dict.work.all : c === "Mobile" ? dict.work.mobile : c);

  const visible = filter === "all" ? items : items.filter((p) => p.filters.includes(filter));

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
      <motion.div layout className={`projects${compact ? " projects--compact" : ""}`}>
        <AnimatePresence mode="popLayout">
          {visible.map((p) => <Card key={p.slug} project={p} locale={locale} />)}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
