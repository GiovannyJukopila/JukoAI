import type { CSSProperties } from "react";
import Link from "next/link";
import type { Project } from "@/lib/content";
import { getDict, type Locale } from "@/lib/i18n";
import { Reveal } from "../Reveal";
import { ArrowUpRight } from "../icons";
import { BrowserFrame, PhoneFrame } from "./Devices";
import { PlatformList, StoreBadge } from "./Stores";
import { visualOf } from "./visuals";

/* The flagship case: product story on the left, the whole ecosystem (web panel + phones) live on the right. */
export function FlagshipCase({ project, locale }: { project: Project; locale: Locale }) {
  const w = getDict(locale).work;
  const href = `/${locale}/proyectos/${project.slug}`;
  const visual = visualOf(project.slug);
  const [phoneA, phoneB] = visual.phones;

  return (
    <Reveal as="article" className="flagship" style={{ "--accent": project.accent } as CSSProperties}>
      <div className="flagship__text">
        <div className="flagship__pills">
          <span className="pill pill--live"><i /> {w.live}</span>
          <span className="pill">{w.featured}</span>
        </div>

        <div className="flagship__brand">
          {visual.mark && <span className="flagship__icon">{visual.mark}</span>}
          <div>
            <h3 className="flagship__title">{project.title}</h3>
            <span className="flagship__tagline">{project.tagline[locale]}</span>
          </div>
        </div>

        <p className="flagship__desc">{project.desc[locale]}</p>

        <dl className="flagship__facts">
          {w.facts.map((f) => (
            <div key={f.v}>
              <dt>{f.v}</dt>
              <dd>{f.l}</dd>
            </div>
          ))}
        </dl>

        <PlatformList platforms={project.platforms} />

        <div className="flagship__actions">
          <Link href={href} className="btn">{w.caseStudy} <ArrowUpRight /></Link>
          {project.link && (
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">{w.visit} <ArrowUpRight /></a>
          )}
        </div>
        {project.stores && (
          <div className="flagship__stores">
            {project.stores.map((s) => <StoreBadge key={s.type} store={s} locale={locale} name={project.title} />)}
          </div>
        )}
      </div>

      <Link href={href} className="flagship__stage" aria-label={`${w.caseStudy} · ${project.title}`}>
        <span className="stage-grid" aria-hidden="true" />
        {visual.desktop && <BrowserFrame className="flagship__browser">{visual.desktop}</BrowserFrame>}
        {phoneA && <PhoneFrame className="flagship__phone flagship__phone--a">{phoneA.node}</PhoneFrame>}
        {phoneB && <PhoneFrame className="flagship__phone flagship__phone--b">{phoneB.node}</PhoneFrame>}
        <span className="flagship__chip" aria-hidden="true">
          <span className="flagship__chip-ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" /></svg>
          </span>
          <span><b>{w.aiChip}</b><small>{w.aiChipSub}</small></span>
        </span>
      </Link>
    </Reveal>
  );
}
