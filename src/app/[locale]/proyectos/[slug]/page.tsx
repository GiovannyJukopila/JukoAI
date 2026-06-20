import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { PROJECTS, getProject, SOCIAL } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ArrowLeft, ArrowUpRight, Check } from "@/components/icons";

export function generateStaticParams() {
  return locales.flatMap((locale) => PROJECTS.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const lc = isLocale(locale) ? locale : "es";
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.desc[lc],
    openGraph: { title: project.title, description: project.desc[lc], images: [project.img] },
  };
}

export default async function ProjectDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const project = getProject(slug);
  if (!project) notFound();

  const others = PROJECTS.filter((p) => p.slug !== project.slug).slice(0, 3);

  return (
    <>
      <div className="page-head">
        <Reveal>
          <Link href={`/${lc}/proyectos`} className="back-link"><ArrowLeft /> {dict.projectDetail.others}</Link>
          <span className="eyebrow" style={{ display: "block" }}>{project.cat}</span>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-lead">{project.desc[lc]}</p>
        </Reveal>
      </div>

      <section className="section section--tight">
        <Reveal className="media-shot" style={undefined}>
          <Image src={project.img} alt={project.title} fill sizes="(max-width: 1240px) 100vw, 1240px" priority />
        </Reveal>

        <div className="detail-grid" style={{ marginTop: "3rem" }}>
          <Reveal className="prose">
            <h2 className="section__title" style={{ fontSize: "1.8rem", marginBottom: "1.2rem" }}>{dict.projectDetail.overview}</h2>
            <p>{project.overview[lc]}</p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="detail-card" style={{ marginBottom: "1.1rem" }}>
              <h4>{dict.projectDetail.role}</h4>
              <ul className="detail-list">
                {project.role[lc].map((r) => <li key={r}><Check /> <span>{r}</span></li>)}
              </ul>
            </div>
            <div className="detail-card" style={{ marginBottom: "1.1rem" }}>
              <h4>{dict.projectDetail.stack}</h4>
              <div className="project__tech">{project.tech.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
            <div className="detail-card">
              <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                {project.link && (
                  <a href={project.link} target="_blank" rel="noopener noreferrer" className="btn">{dict.projectDetail.visit} <ArrowUpRight /></a>
                )}
                {project.stores?.map((s) => (
                  <a key={s.type} href={s.url} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">{s.type}</a>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* CTA */}
        <Reveal className="contact__card" delay={0.05}>
          <div style={{ marginTop: "4rem" }} />
          <h2 className="contact__title">{dict.projectDetail.cta}</h2>
          <p className="contact__sub">{dict.contact.sub}</p>
          <div className="contact__actions">
            <Link href={`/${lc}#contact`} className="btn btn--lg">{dict.projectDetail.contactCta}</Link>
            <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--lg">{dict.contact.wa}</a>
          </div>
        </Reveal>

        {/* Other projects */}
        <Reveal>
          <h2 className="section__title" style={{ fontSize: "1.8rem", margin: "4rem 0 1.6rem" }}>{dict.projectDetail.others}</h2>
        </Reveal>
        <div className="index-grid">
          {others.map((p, i) => (
            <Reveal as="article" className="index-card" key={p.slug} delay={i * 0.05} style={{ padding: 0, overflow: "hidden" }}>
              <Link href={`/${lc}/proyectos/${p.slug}`} className="media-shot" style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--border)" }}>
                <Image src={p.img} alt={p.title} fill sizes="(max-width: 900px) 100vw, 33vw" />
              </Link>
              <div style={{ padding: "1.6rem" }}>
                <h3 style={{ fontSize: "1.15rem", marginBottom: ".5rem" }}>{p.title}</h3>
                <Link href={`/${lc}/proyectos/${p.slug}`} className="bento__more">{dict.work.caseStudy} <ArrowUpRight /></Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
