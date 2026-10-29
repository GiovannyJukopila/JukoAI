import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { SERVICES } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { RevealTitle } from "@/components/scroll/RevealTitle";
import { ServiceGlyph, ArrowUpRight, ArrowLeft, BoltIcon, Check } from "@/components/icons";
import { QuoteButton } from "@/components/QuoteButton";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { ServiceCta } from "@/components/services/ServiceCta";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const seo = getDict(lc).seo;
  return pageMetadata({ locale: lc, path: "/servicios", title: seo.servicesTitle, description: seo.servicesDesc });
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export default async function ServicesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const sp = dict.servicesPage;
  const total = num(SERVICES.length - 1);

  return (
    <>
      {/* HERO: the promise on the left, an index of every service on the right */}
      <header className="svc-hero">
        <div className="svc-hero__copy">
          <Link href={`/${lc}`} className="back-link"><ArrowLeft /> Juko AI</Link>
          <span className="eyebrow">{dict.services.eyebrow}</span>
          <RevealTitle as="h1" className="svc-hero__title" text={sp.title} accentFrom={sp.accentFrom} />
          <Reveal delay={0.25}>
            <p className="svc-hero__lead">{sp.lead}</p>
            <div className="svc-hero__actions">
              <QuoteButton className="btn btn--lg"><BoltIcon size={15} />{dict.quote.cta}</QuoteButton>
              <WhatsAppLink className="btn btn--ghost btn--lg">{dict.contact.wa}</WhatsAppLink>
            </div>
            <p className="cta-promise">{dict.quote.promise}</p>
          </Reveal>
        </div>

        <Reveal className="svc-index" delay={0.15}>
          <div className="svc-index__bar" aria-hidden="true"><i /><i /><i /><span>juko.ai / {dict.nav.services.toLowerCase()}</span></div>
          <p className="svc-index__label">{sp.index}</p>
          <ol>
            {SERVICES.map((s, i) => (
              <li key={s.slug}>
                <a href={`#${s.slug}`}>
                  <span className="svc-index__num">{num(i)}</span>
                  <span className="svc-index__icon"><ServiceGlyph name={s.icon} /></span>
                  <span className="svc-index__name">{s.title[lc]}</span>
                  <ArrowUpRight size={14} />
                </a>
              </li>
            ))}
          </ol>
        </Reveal>
      </header>

      {/* EVERY SERVICE as a chapter: what it is, what it includes, what it changes */}
      <section className="svc-list">
        {SERVICES.map((s, i) => (
          <Reveal as="article" id={s.slug} className="svc-row" key={s.slug}>
            <span className="svc-row__ghost" aria-hidden="true">{num(i)}</span>
            <div className="svc-row__main">
              <div className="svc-row__top">
                <span className="svc-row__icon"><ServiceGlyph name={s.icon} /></span>
                <span className="svc-row__num">{num(i)} / {total}</span>
              </div>
              <h2 className="svc-row__title">
                <Link href={`/${lc}/servicios/${s.slug}`} className="svc-row__link">{s.title[lc]}</Link>
              </h2>
              <p className="svc-row__short">{s.short[lc]}</p>
            </div>
            <div className="svc-row__col">
              <h3 className="svc-row__label">{sp.includes}</h3>
              <ul className="svc-row__inc">
                {s.includes[lc].slice(0, 4).map((it) => <li key={it}><Check size={14} /><span>{it}</span></li>)}
              </ul>
            </div>
            <div className="svc-row__col svc-row__aside">
              <h3 className="svc-row__label">{sp.outcomes}</h3>
              <ul className="svc-row__out">
                {s.highlights[lc].map((h) => <li key={h}>{h}</li>)}
              </ul>
              <span className="svc-row__go" aria-hidden="true">{sp.view}<i><ArrowUpRight size={16} /></i></span>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="section section--tight">
        <ServiceCta locale={lc} title={sp.ctaTitle} lead={sp.ctaLead} />
      </section>
    </>
  );
}
