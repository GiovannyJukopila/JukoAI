import type { Metadata } from "next";
import { locales, type Locale } from "./i18n";
import { SOCIAL, SERVICES, WHATSAPP, type Service } from "./content";

/*
 * Search (SEO), answer engines (AEO) and generative engines (GEO): one place for canonical URLs,
 * hreflang, social cards and the Schema.org data that lets Google, assistants and AI models
 * understand who Juko AI is, what it offers and answer questions about it.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://juko.ai").replace(/\/$/, "");
export const BRAND = "Juko AI";
const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: BRAND };
const ORG_ID = `${SITE_URL}/#organization`;

/** Canonical URL and hreflang alternates for a path under a locale ("" is the home). */
export function localeAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  const languages: Record<string, string> = Object.fromEntries(locales.map((l) => [l, `/${l}${path}`]));
  languages["x-default"] = `/es${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

/** A page's metadata: title, description, alternates and the social cards that go with them. */
export function pageMetadata({ locale, path = "", title, description, absoluteTitle = false }: {
  locale: Locale; path?: string; title: string; description: string; absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      type: "website", siteName: BRAND, title, description, url: `/${locale}${path}`,
      locale: locale === "en" ? "en_GB" : "es_ES", alternateLocale: locale === "en" ? ["es_ES"] : ["en_GB"],
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

type Ld = Record<string, unknown>;

/** Who we are: the studio as a professional service, with what it offers and where. */
export function organizationLd(locale: Locale): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: BRAND,
    url: SITE_URL,
    logo: `${SITE_URL}/juko-mark.svg`,
    image: `${SITE_URL}/og.png`,
    description: locale === "en"
      ? "Software and artificial intelligence studio: custom iOS and Android apps, websites, AI automation and agents, cloud, integrations, and SEO, AEO and GEO strategies."
      : "Estudio de software e inteligencia artificial: apps iOS y Android a medida, webs, automatización y agentes con IA, cloud, integraciones y estrategias de SEO, AEO y GEO.",
    sameAs: [SOCIAL.linkedin, SOCIAL.github],
    areaServed: ["Europe", "Latin America"],
    availableLanguage: ["es", "en"],
    address: { "@type": "PostalAddress", addressCountry: "MT" },
    contactPoint: [
      { "@type": "ContactPoint", contactType: "sales", telephone: WHATSAPP.latam.label.replace(/\s/g, ""), url: WHATSAPP.latam.base, areaServed: "Latin America", availableLanguage: ["es", "en"] },
      { "@type": "ContactPoint", contactType: "sales", telephone: WHATSAPP.intl.label.replace(/\s/g, ""), url: WHATSAPP.intl.base, areaServed: "Europe", availableLanguage: ["es", "en"] },
    ],
    knowsAbout: ["Software development", "Mobile apps", "Web development", "Artificial intelligence", "AI agents", "Automation", "Cloud", "APIs", "SEO", "Answer engine optimization", "Generative engine optimization"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: locale === "en" ? "Services" : "Servicios",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title[locale], url: `${SITE_URL}/${locale}/servicios/${s.slug}` },
      })),
    },
  };
}

export function websiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND,
    inLanguage: ["es", "en"],
    publisher: { "@id": ORG_ID },
  };
}

/** Questions and answers in the shape answer engines read directly. */
export function faqLd(items: readonly { q: string; a: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

export function serviceLd(service: Service, locale: Locale): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title[locale],
    description: service.lead[locale],
    serviceType: service.title[locale],
    url: `${SITE_URL}/${locale}/servicios/${service.slug}`,
    provider: { "@id": ORG_ID },
    areaServed: ["Europe", "Latin America"],
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: `${SITE_URL}${t.path}` })),
  };
}
