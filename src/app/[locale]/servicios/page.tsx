import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { SERVICES, SOCIAL } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ServiceGlyph, ArrowUpRight } from "@/components/icons";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc = isLocale(locale) ? locale : "es";
  return { title: getDict(lc).nav.services };
}

export default async function ServicesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);

  return (
    <>
      <div className="page-head">
        <Reveal>
          <Link href={`/${lc}`} className="back-link"><ArrowUpRight size={13} /> Juko AI</Link>
          <span className="eyebrow" style={{ display: "block" }}>{dict.services.eyebrow}</span>
          <h1 className="page-title">{dict.servicesPage.title}</h1>
          <p className="page-lead">{dict.servicesPage.lead}</p>
        </Reveal>
      </div>

      <section className="section section--tight">
        <div className="index-grid">
          {SERVICES.map((s, i) => (
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

        <Reveal className="contact__card" delay={0.1}>
          <div style={{ marginTop: "4rem" }} />
          <h2 className="contact__title">{dict.contact.title}</h2>
          <p className="contact__sub">{dict.contact.sub}</p>
          <div className="contact__actions">
            <Link href={`/${lc}#contact`} className="btn btn--lg">{dict.serviceDetail.cta}</Link>
            <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--lg">{dict.contact.wa}</a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
