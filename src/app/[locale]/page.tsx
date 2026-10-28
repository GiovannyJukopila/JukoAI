import Link from "next/link";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { SERVICES, PROJECTS } from "@/lib/content";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { FlagshipCase } from "@/components/work/FlagshipCase";
import { AppsShowcase } from "@/components/work/AppsShowcase";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/Reveal";
import { ServiceGlyph, ArrowUpRight } from "@/components/icons";
import { AIFlow } from "@/components/AIFlow";
import { AIStats } from "@/components/AIStats";
import { Manifesto } from "@/components/scroll/Manifesto";
import { ProcessHolo } from "@/components/scroll/ProcessHolo";
import { WorkBackdrop } from "@/components/work/WorkBackdrop";
import { Needs } from "@/components/scroll/Needs";
import { ProcessStack } from "@/components/scroll/ProcessStack";
import { RevealTitle } from "@/components/scroll/RevealTitle";
import { ScrollScale } from "@/components/scroll/ScrollScale";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, faqLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Faq } from "@/components/Faq";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const seo = getDict(lc).seo;
  return pageMetadata({ locale: lc, title: seo.homeTitle, description: seo.homeDesc, absoluteTitle: true });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const home = `/${lc}`;
  const flagship = PROJECTS.find((p) => p.featured)!;
  const homeProjects = ["coosalud", "comeca", "noir"].map((slug) => PROJECTS.find((p) => p.slug === slug)!);

  return (
    <>
      <Hero locale={lc} />
      <Marquee />
      <Manifesto locale={lc} />
      <ProcessHolo locale={lc} />

      {/* WORK */}
      <section className="section work" id="work">
        <WorkBackdrop />
        <Reveal className="section__head">
          <span className="eyebrow">{dict.work.eyebrow}</span>
          <RevealTitle className="section__title" text={dict.work.title} accentFrom={2} />
          <p className="section__sub">{dict.work.sub}</p>
        </Reveal>
        <ScrollScale><FlagshipCase project={flagship} locale={lc} /></ScrollScale>
        <div className="work-gap" />
        <ProjectsGrid locale={lc} showFilters={false} items={homeProjects} stagger />
        <AppsShowcase locale={lc} />
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <Link href={`${home}/proyectos`} className="btn">{dict.work.viewAll}</Link>
        </div>
      </section>

      <Needs locale={lc} />

      {/* SERVICES */}
      <section className="section" id="services">
        <Reveal className="section__head">
          <span className="eyebrow">{dict.services.eyebrow}</span>
          <RevealTitle className="section__title" text={dict.services.title} />
          <p className="section__sub">{dict.services.sub}</p>
        </Reveal>

        <div className="bento">
          {SERVICES.map((s, i) => (
            <Reveal
              as="article"
              key={s.slug}
              delay={i * 0.05}
              className={`bento__card${s.size ? ` bento__card--${s.size}` : ""}`}
            >
              <div className="bento__icon"><ServiceGlyph name={s.icon} /></div>
              <h3>{s.title[lc]}</h3>
              <p>{s.short[lc]}</p>
              <ul className="bento__tags">{s.stack.slice(0, 4).map((t) => <li key={t}>{t}</li>)}</ul>
              {s.slug === "automatizacion-ia" && (
                <>
                  <AIStats locale={lc} />
                  <div className="bento__diagram"><AIFlow locale={lc} /></div>
                </>
              )}
              <Link href={`${home}/servicios/${s.slug}`} className="bento__more">
                {dict.services.more} <ArrowUpRight />
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal className="section__head" delay={0.1}>
          <div style={{ marginTop: "2.4rem", textAlign: "center" }}>
            <Link href={`${home}/servicios`} className="btn btn--ghost">{dict.services.all}</Link>
          </div>
        </Reveal>
      </section>

      {/* PROCESS */}
      <section className="section" id="process">
        <Reveal className="section__head">
          <span className="eyebrow">{dict.process.eyebrow}</span>
          <RevealTitle className="section__title" text={dict.process.title} />
          <p className="section__sub">{dict.process.sub}</p>
        </Reveal>
        <ProcessStack locale={lc} />
      </section>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="about__grid">
          <Reveal className="about__text">
            <span className="eyebrow">{dict.about.eyebrow}</span>
            <RevealTitle className="section__title" text={dict.about.title} />
            <p>{dict.about.p1}</p>
            <p>{dict.about.p2}</p>
            <Link href={`${home}#contact`} className="btn btn--lg">{dict.about.cta}</Link>
          </Reveal>
          <Reveal className="about__stats" delay={0.1}>
            {dict.about.kpis.map((k, i) => (
              <div className="kpi" key={i}>
                <b>{k.v}</b>
                <span>{k.l}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* FAQ: answers in the page and as FAQPage data for answer engines */}
      <Faq locale={lc} />
      <JsonLd data={faqLd(dict.faq.items)} />

      {/* CONTACT */}
      <section className="section" id="contact">
        <Reveal className="reach">
          <div className="reach__aside">
            <span className="eyebrow">{dict.contact.eyebrow}</span>
            <RevealTitle className="reach__title" text={dict.contact.title} />
            <p className="reach__lead">{dict.contact.lead}</p>
            <div className="reach__promise">
              <span className="reach__promise-value"><i aria-hidden="true" />{dict.contact.promiseValue}</span>
              <div><b>{dict.contact.promiseLabel}</b><small>{dict.contact.promiseText}</small></div>
            </div>
            <h3 className="reach__next-title">{dict.contact.nextTitle}</h3>
            <ol className="reach__steps">
              {dict.contact.next.map((step, i) => (
                <li key={step.t}>
                  <span className="reach__step-num">{String(i + 1).padStart(2, "0")}</span>
                  <div><b>{step.t}</b><span>{step.d}</span></div>
                </li>
              ))}
            </ol>
            <div className="reach__direct">
              <span>{dict.contact.direct}</span>
              <WhatsAppLink className="reach__wa">
                <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M16.04 4C9.96 4 5.02 8.94 5.02 15.02c0 1.94.51 3.84 1.48 5.51L4.9 27l6.64-1.56a11 11 0 0 0 4.5.96h.01c6.07 0 11.01-4.94 11.02-11.02C27.07 8.94 22.12 4 16.04 4Zm0 19.86h-.01a9.1 9.1 0 0 1-4.64-1.27l-.33-.2-3.94.93.84-3.84-.22-.35a9.07 9.07 0 0 1-1.39-4.84c0-5.02 4.09-9.1 9.12-9.1 2.43 0 4.72.95 6.44 2.67a9.05 9.05 0 0 1 2.66 6.44c0 5.03-4.09 9.11-9.13 9.11Z" /></svg>
                {dict.contact.waCta}
              </WhatsAppLink>
            </div>
          </div>
          <div className="reach__panel">
            <ContactForm locale={lc} />
          </div>
        </Reveal>
      </section>
    </>
  );
}
