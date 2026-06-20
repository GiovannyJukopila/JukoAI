import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, isLocale, locales, type Locale } from "@/lib/i18n";
import { SOCIAL } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { ArrowLeft } from "@/components/icons";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc = isLocale(locale) ? locale : "es";
  return { title: getDict(lc).nav.work };
}

export default async function ProjectsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;
  const dict = getDict(lc);

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
        <ProjectsGrid locale={lc} showFilters compact />

        <Reveal className="contact__card" delay={0.1} style={{ marginTop: "5.5rem" }}>
          <h2 className="contact__title">{dict.projectDetail.cta}</h2>
          <p className="contact__sub">{dict.contact.sub}</p>
          <div className="contact__actions">
            <Link href={`/${lc}#contact`} className="btn btn--lg">{dict.projectDetail.contactCta}</Link>
            <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--lg">{dict.contact.wa}</a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
