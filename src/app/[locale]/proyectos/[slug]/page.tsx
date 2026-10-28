import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { PROJECTS, getProject, domainOf } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { BrowserFrame, PhoneFrame } from "@/components/work/Devices";
import { PlatformList, StoreBadge } from "@/components/work/Stores";
import { visualOf } from "@/components/work/visuals";
import { ArrowLeft, ArrowUpRight, BoltIcon, Check } from "@/components/icons";
import { QuoteButton } from "@/components/QuoteButton";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export function generateStaticParams() {
  return locales.flatMap((locale) => PROJECTS.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const project = getProject(slug);
  if (!project) return {};
  return pageMetadata({ locale: lc, path: `/proyectos/${slug}`, title: project.title, description: project.desc[lc] });
}

export default async function ProjectDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const d = dict.projectDetail;
  const project = getProject(slug);
  if (!project) notFound();

  const others = PROJECTS.filter((p) => p.slug !== project.slug).slice(0, 3);
  const visual = visualOf(project.slug);
  const domain = visual.domain === null ? undefined : visual.domain ?? domainOf(project);
  // The hero already shows the first screens; the rest go in the "screens" strip.
  const heroPhones = visual.desktop ? visual.phones.slice(0, 1) : visual.phones.slice(0, 3);
  const morePhones = visual.desktop ? visual.phones.slice(1) : visual.phones.slice(3);
  const cat = project.cat === "Mobile" ? dict.work.mobile : project.cat;

  return (
    <div style={{ "--accent": project.accent } as CSSProperties}>
      <JsonLd data={breadcrumbLd([{ name: "Juko AI", path: `/${lc}` }, { name: dict.nav.work, path: `/${lc}/proyectos` }, { name: project.title, path: `/${lc}/proyectos/${project.slug}` }])} />
      <div className="page-head case-head">
        <Reveal>
          <Link href={`/${lc}/proyectos`} className="back-link"><ArrowLeft /> {d.others}</Link>
          <div className="case-head__pills">
            <span className="pill pill--live"><i /> {dict.work.live}</span>
            <span className="pill">{cat}</span>
          </div>
          <div className="case-head__brand">
            {visual.mark && <span className="case-head__icon">{visual.mark}</span>}
            <h1 className="page-title">{project.title}</h1>
          </div>
          <p className="case-head__tagline">{project.tagline[lc]}</p>
          <p className="page-lead">{project.desc[lc]}</p>

          <dl className="case-meta">
            <div><dt>{d.sector}</dt><dd>{project.sector[lc]}</dd></div>
            <div><dt>{d.location}</dt><dd>{project.location[lc]}</dd></div>
            <div><dt>{d.platforms}</dt><dd><PlatformList platforms={project.platforms} /></dd></div>
          </dl>

          <div className="case-head__actions">
            {project.link && (
              <a href={project.link} target="_blank" rel="noopener noreferrer" className="btn btn--lg">{d.visit} <ArrowUpRight /></a>
            )}
            {project.stores?.map((s) => <StoreBadge key={s.type} store={s} locale={lc} name={project.title} />)}
          </div>
        </Reveal>
      </div>

      <section className="section section--tight">
        {/* Hero stage: the product itself, built in code */}
        <Reveal className={`case-stage${visual.desktop ? "" : " case-stage--app"}`}>
          <span className="stage-grid" aria-hidden="true" />
          {visual.desktop ? (
            <>
              <BrowserFrame domain={domain} className="case-stage__browser">{visual.desktop}</BrowserFrame>
              {heroPhones[0] && <PhoneFrame className="case-stage__phone">{heroPhones[0].node}</PhoneFrame>}
            </>
          ) : (
            <div className={`case-stage__phones case-stage__phones--${heroPhones.length}`}>
              {heroPhones.map((p, i) => (
                <PhoneFrame key={p.key} className={`case-stage__fan case-stage__fan--${i}`}>{p.node}</PhoneFrame>
              ))}
            </div>
          )}
        </Reveal>

        <div className="detail-grid" style={{ marginTop: "4rem" }}>
          <Reveal className="prose">
            <h2 className="section__title" style={{ fontSize: "1.8rem", marginBottom: "1.2rem" }}>{d.overview}</h2>
            <p>{project.overview[lc]}</p>
            <h3 className="case-sub">{d.highlights}</h3>
            <ul className="case-highlights">
              {project.highlights[lc].map((h) => <li key={h}><Check size={14} /> <span>{h}</span></li>)}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="detail-card" style={{ marginBottom: "1.1rem" }}>
              <h4>{d.role}</h4>
              <ul className="detail-list">
                {project.role[lc].map((r) => <li key={r}><Check /> <span>{r}</span></li>)}
              </ul>
            </div>
            <div className="detail-card">
              <h4>{d.stack}</h4>
              <div className="project__tech">{project.tech.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
          </Reveal>
        </div>

        {/* More screens of the product */}
        {morePhones.length > 0 && (
          <div className="case-gallery">
            <Reveal>
              <h2 className="section__title" style={{ fontSize: "1.8rem", marginBottom: "1.6rem" }}>{d.gallery}</h2>
            </Reveal>
            <div className="case-gallery__apps">
              {morePhones.map((p, i) => (
                <Reveal key={p.key} delay={i * 0.05} className="case-gallery__app">
                  <PhoneFrame>{p.node}</PhoneFrame>
                  <p className="case-gallery__cap">{p.label[lc]}</p>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <Reveal className="contact__card" delay={0.05} style={{ marginTop: "5rem" }}>
          <h2 className="contact__title">{d.cta}</h2>
          <p className="contact__sub">{dict.contact.sub}</p>
          <div className="contact__actions">
            <QuoteButton className="btn btn--lg"><BoltIcon size={15} />{dict.quote.cta}</QuoteButton>
            <WhatsAppLink className="btn btn--ghost btn--lg">{dict.contact.wa}</WhatsAppLink>
          </div>
          <p className="cta-promise">{dict.quote.promise}</p>
        </Reveal>

        {/* Other projects */}
        <Reveal>
          <h2 className="section__title" style={{ fontSize: "1.8rem", margin: "4.5rem 0 1.6rem" }}>{d.others}</h2>
        </Reveal>
        <ProjectsGrid locale={lc} showFilters={false} items={others} />
      </section>
    </div>
  );
}
