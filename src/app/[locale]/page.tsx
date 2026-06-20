import Link from "next/link";
import { getDict, isLocale, type Locale } from "@/lib/i18n";
import { SERVICES, PROJECTS } from "@/lib/content";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { ContactForm } from "@/components/ContactForm";
import { Showcase } from "@/components/Showcase";
import { Reveal } from "@/components/Reveal";
import { ServiceGlyph, ArrowUpRight } from "@/components/icons";
import { AIFlow } from "@/components/AIFlow";
import { AIStats } from "@/components/AIStats";
import { notFound } from "next/navigation";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const home = `/${lc}`;
  const homeProjects = PROJECTS.slice(0, 3);

  return (
    <>
      <Hero locale={lc} />
      <Marquee />
      <Showcase locale={lc} />

      {/* SERVICES */}
      <section className="section" id="services">
        <Reveal className="section__head">
          <span className="eyebrow">{dict.services.eyebrow}</span>
          <h2 className="section__title">{dict.services.title}</h2>
          <p className="section__sub">{dict.services.sub}</p>
        </Reveal>

        <div className="bento">
          {SERVICES.map((s, i) => (
            <Reveal
              as="article"
              key={s.slug}
              delay={i * 0.05}
              className={`bento__card${s.size === "lg" ? " bento__card--lg" : ""}`}
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

      {/* WORK */}
      <section className="section" id="work">
        <Reveal className="section__head">
          <span className="eyebrow">{dict.work.eyebrow}</span>
          <h2 className="section__title">{dict.work.title}</h2>
          <p className="section__sub">{dict.work.sub}</p>
        </Reveal>
        <ProjectsGrid locale={lc} showFilters={false} items={homeProjects} compact />
        <div style={{ marginTop: "2.6rem", textAlign: "center" }}>
          <Link href={`${home}/proyectos`} className="btn">{dict.work.viewAll}</Link>
        </div>
      </section>

      {/* PROCESS */}
      <section className="section" id="process">
        <Reveal className="section__head">
          <span className="eyebrow">{dict.process.eyebrow}</span>
          <h2 className="section__title">{dict.process.title}</h2>
          <p className="section__sub">{dict.process.sub}</p>
        </Reveal>
        <div className="steps">
          {dict.process.steps.map((step, i) => (
            <Reveal className="step" key={i} delay={i * 0.06}>
              <span className="step__num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{step.t}</h3>
              <p>{step.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="about__grid">
          <Reveal className="about__text">
            <span className="eyebrow">{dict.about.eyebrow}</span>
            <h2 className="section__title">{dict.about.title}</h2>
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

      {/* CONTACT */}
      <section className="section" id="contact">
        <Reveal className="contact__card">
          <span className="eyebrow">{dict.contact.eyebrow}</span>
          <h2 className="contact__title">{dict.contact.title}</h2>
          <p className="contact__sub">{dict.contact.sub}</p>
          <ContactForm locale={lc} />
        </Reveal>
      </section>
    </>
  );
}
