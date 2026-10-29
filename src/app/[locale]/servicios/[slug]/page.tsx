import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, serviceLd, breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { SERVICES, getService } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { RevealTitle } from "@/components/scroll/RevealTitle";
import { ServiceGlyph, ArrowLeft, ArrowUpRight, BoltIcon, Check } from "@/components/icons";
import { QuoteButton } from "@/components/QuoteButton";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { ServiceOrbit } from "@/components/services/ServiceOrbit";
import { ServiceCta } from "@/components/services/ServiceCta";

export function generateStaticParams() {
  return locales.flatMap((locale) => SERVICES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const service = getService(slug);
  if (!service) return {};
  return pageMetadata({ locale: lc, path: `/servicios/${slug}`, title: service.title[lc], description: service.short[lc] });
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export default async function ServiceDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const sd = dict.serviceDetail;
  const service = getService(slug);
  if (!service) notFound();

  const at = SERVICES.indexOf(service);
  const prev = SERVICES[(at - 1 + SERVICES.length) % SERVICES.length];
  const next = SERVICES[(at + 1) % SERVICES.length];
  // the quote quiz opens with this service's need already ticked
  const needs = [dict.contact.form.needOptions[service.need]];
  const base = `/${lc}/servicios`;

  return (
    <>
      <JsonLd data={[
        serviceLd(service, lc),
        breadcrumbLd([{ name: "Juko AI", path: `/${lc}` }, { name: dict.nav.services, path: base }, { name: service.title[lc], path: `${base}/${service.slug}` }]),
      ]} />

      {/* HERO: what it is and the ask, beside the service's emblem with the tools it runs on */}
      <header className="svc-hero svc-hero--detail">
        <div className="svc-hero__copy">
          <nav className="svc-crumb" aria-label="Breadcrumb">
            <Link href={base}><ArrowLeft /> {sd.crumb}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{service.title[lc]}</span>
          </nav>
          <span className="svc-hero__num">{num(at)} / {num(SERVICES.length - 1)}</span>
          <RevealTitle as="h1" className="svc-hero__title" text={service.title[lc]} />
          <Reveal delay={0.25}>
            <p className="svc-hero__lead">{service.lead[lc]}</p>
            <div className="svc-hero__actions">
              <QuoteButton className="btn btn--lg" needs={needs}><BoltIcon size={15} />{sd.quote}</QuoteButton>
              <WhatsAppLink className="btn btn--ghost btn--lg">{dict.contact.wa}</WhatsAppLink>
            </div>
            <p className="cta-promise">{dict.quote.promise}</p>
          </Reveal>
        </div>
        <Reveal className="svc-hero__visual" delay={0.15}>
          <ServiceOrbit icon={service.icon} stack={service.stack} label={sd.stack} />
        </Reveal>
      </header>

      {/* OUTCOMES */}
      <section className="svc-wrap svc-outcomes">
        <Reveal><span className="eyebrow">{sd.highlights}</span></Reveal>
        <div className="svc-outcomes__grid">
          {service.highlights[lc].map((h, i) => (
            <Reveal as="article" className="svc-outcome" key={h} delay={i * 0.08}>
              <span className="svc-outcome__num">{num(i)}</span>
              <p>{h}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHAT'S INCLUDED: the heading holds still while the deliverables pass by */}
      <section className="svc-wrap svc-includes">
        <div className="svc-includes__head">
          <span className="eyebrow">{sd.includes}</span>
          <RevealTitle className="svc-includes__title" text={sd.includesLead} />
        </div>
        <ol className="svc-includes__grid">
          {service.includes[lc].map((it, i) => (
            <Reveal as="li" className="svc-inc" key={it} delay={(i % 2) * 0.08}>
              <span className="svc-inc__num">{num(i)}</span>
              <span className="svc-inc__check"><Check size={15} /></span>
              <p>{it}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="section section--tight">
        <ServiceCta locale={lc} title={sd.cta} lead={dict.servicesPage.ctaLead} quote={sd.quote} needs={needs} />
      </section>

      {/* PREVIOUS / NEXT SERVICE */}
      <nav className="svc-wrap svc-pager" aria-label={sd.others}>
        {[{ s: prev, label: sd.prev, dir: "prev" }, { s: next, label: sd.next, dir: "next" }].map(({ s, label, dir }) => (
          <Link key={dir} href={`${base}/${s.slug}`} className={`svc-pager__link svc-pager__link--${dir}`}>
            <span className="svc-pager__label">{label}</span>
            <span className="svc-pager__title">
              <span className="svc-pager__icon"><ServiceGlyph name={s.icon} /></span>
              {s.title[lc]}
            </span>
            <i className="svc-pager__arrow" aria-hidden="true">{dir === "prev" ? <ArrowLeft size={18} /> : <ArrowUpRight size={18} />}</i>
          </Link>
        ))}
        <Link href={base} className="svc-pager__all">{sd.all} <ArrowUpRight /></Link>
      </nav>
    </>
  );
}
