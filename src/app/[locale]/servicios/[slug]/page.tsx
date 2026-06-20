import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { SERVICES, getService, SOCIAL } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ServiceGlyph, ArrowLeft, ArrowUpRight, Check } from "@/components/icons";

export function generateStaticParams() {
  return locales.flatMap((locale) => SERVICES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const lc = isLocale(locale) ? locale : "es";
  const service = getService(slug);
  if (!service) return {};
  return { title: service.title[lc], description: service.short[lc] };
}

export default async function ServiceDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const service = getService(slug);
  if (!service) notFound();

  const others = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <div className="page-head">
        <Reveal>
          <Link href={`/${lc}/servicios`} className="back-link"><ArrowLeft /> {dict.serviceDetail.others}</Link>
          <div className="bento__icon" style={{ marginBottom: "1.4rem" }}><ServiceGlyph name={service.icon} /></div>
          <h1 className="page-title">{service.title[lc]}</h1>
          <p className="page-lead">{service.lead[lc]}</p>
        </Reveal>
      </div>

      <section className="section section--tight">
        <div className="detail-grid">
          <Reveal className="prose">
            <h2 className="section__title" style={{ fontSize: "1.8rem", marginBottom: "1.4rem" }}>{dict.serviceDetail.includes}</h2>
            <div className="detail-card">
              <ul className="detail-list">
                {service.includes[lc].map((item) => (
                  <li key={item}><Check /> <span>{item}</span></li>
                ))}
              </ul>
            </div>

            <h2 className="section__title" style={{ fontSize: "1.8rem", margin: "2.6rem 0 1.2rem" }}>{dict.serviceDetail.highlights}</h2>
            <div className="feature-row">
              {service.highlights[lc].map((h, i) => (
                <div className="feature" key={i}>
                  <h4 className="grad">{String(i + 1).padStart(2, "0")}</h4>
                  <p>{h}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="detail-card" style={{ marginBottom: "1.1rem" }}>
              <h4>{dict.serviceDetail.stack}</h4>
              <div className="project__tech">{service.stack.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
            <div className="detail-card">
              <h4>{dict.serviceDetail.cta}</h4>
              <p style={{ color: "var(--ink-soft)", fontSize: ".95rem", marginBottom: "1.3rem" }}>{dict.contact.sub}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                <Link href={`/${lc}#contact`} className="btn">{dict.projectDetail.contactCta}</Link>
                <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">{dict.contact.wa}</a>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Other services */}
        <Reveal>
          <h2 className="section__title" style={{ fontSize: "1.8rem", margin: "4rem 0 1.6rem" }}>{dict.serviceDetail.others}</h2>
        </Reveal>
        <div className="index-grid">
          {others.map((s, i) => (
            <Reveal as="article" className="index-card" key={s.slug} delay={i * 0.05}>
              <div className="bento__icon"><ServiceGlyph name={s.icon} /></div>
              <h3>{s.title[lc]}</h3>
              <p>{s.short[lc]}</p>
              <Link href={`/${lc}/servicios/${s.slug}`} className="bento__more" style={{ marginTop: "1.4rem" }}>
                {dict.services.more} <ArrowUpRight />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
