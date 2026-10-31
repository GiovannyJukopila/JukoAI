import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { LEGAL_PATH, getLegalDoc } from "@/lib/legal";
import { LegalPage } from "@/components/legal/LegalPage";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const doc = getLegalDoc("privacy", lc);
  return pageMetadata({ locale: lc, path: LEGAL_PATH.privacy, title: doc.title, description: doc.lead });
}

export default async function Privacy({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LegalPage kind="privacy" locale={locale} />;
}
