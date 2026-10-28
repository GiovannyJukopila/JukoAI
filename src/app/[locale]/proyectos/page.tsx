import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { PROJECTS } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { FlagshipCase } from "@/components/work/FlagshipCase";
import { AppsShowcase } from "@/components/work/AppsShowcase";
import { ArrowLeft, BoltIcon } from "@/components/icons";
import { QuoteButton } from "@/components/QuoteButton";
import { WhatsAppLink } from "@/components/WhatsAppLink";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const seo = getDict(lc).seo;
  return pageMetadata({ locale: lc, path: "/proyectos", title: seo.projectsTitle, description: seo.projectsDesc });
}

export default async function ProjectsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);
  const flagship = PROJECTS.find((p) => p.featured)!;
  const rest = PROJECTS.filter((p) => !p.featured);

  return (
    <>
      <div className="page-head">
        <Reveal>
          <Link href={`/${lc}`} className="back-link"><ArrowLeft /> Juko AI</Link>
          <span className="eyebrow" style={{ display: "block" }}>{dict.work.eyebrow}</span>
          <h1 className="page-title">{dict.projectsPage.title}</h1>
          <p className="page-lead">{dict.projectsPage.lead}</p>
        </Reveal>
      </div>

      <section className="section section--tight">
        <FlagshipCase project={flagship} locale={lc} />
        <div className="work-gap" />
        <ProjectsGrid locale={lc} showFilters items={rest} />
        <AppsShowcase locale={lc} />

        <Reveal className="contact__card" delay={0.1} style={{ marginTop: "5.5rem" }}>
          <h2 className="contact__title">{dict.projectDetail.cta}</h2>
          <p className="contact__sub">{dict.contact.sub}</p>
          <div className="contact__actions">
            <QuoteButton className="btn btn--lg"><BoltIcon size={15} />{dict.quote.cta}</QuoteButton>
            <WhatsAppLink className="btn btn--ghost btn--lg">{dict.contact.wa}</WhatsAppLink>
          </div>
          <p className="cta-promise">{dict.quote.promise}</p>
        </Reveal>
      </section>
    </>
  );
}
