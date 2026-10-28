import { getDict } from "@/lib/i18n";
import { SERVICES, PROJECTS, SOCIAL, WHATSAPP } from "@/lib/content";
import { SITE_URL, BRAND } from "@/lib/seo";

/*
 * llms.txt (llmstxt.org): a plain summary of the studio for AI models and generative engines,
 * built from the same content as the site so it never drifts.
 */
export const dynamic = "force-static";

export function GET() {
  const en = getDict("en");
  const es = getDict("es");
  const lines = [
    `# ${BRAND}`,
    "",
    `> ${en.seo.homeDesc}`,
    "",
    "Software and artificial intelligence studio working remotely with clients in Europe and Latin America, in English and Spanish. It designs, builds and launches custom mobile apps (iOS and Android), websites, AI automation and agents, cloud infrastructure, integrations, and SEO, AEO and GEO strategies. Every request gets a reply within 24 hours.",
    "",
    "## Services",
    ...SERVICES.map((s) => `- [${s.title.en}](${SITE_URL}/en/servicios/${s.slug}): ${s.short.en}`),
    "",
    "## Selected work",
    ...PROJECTS.map((p) => `- [${p.title}](${SITE_URL}/en/proyectos/${p.slug}): ${p.desc.en}`),
    "",
    "## FAQ",
    ...en.faq.items.flatMap((it) => [`### ${it.q}`, it.a, ""]),
    "## Contact",
    `- Get a quote: ${SITE_URL}/en#contact`,
    `- WhatsApp (Latin America): ${WHATSAPP.latam.base}`,
    `- WhatsApp (Europe and rest of the world): ${WHATSAPP.intl.base}`,
    `- LinkedIn: ${SOCIAL.linkedin}`,
    "",
    "## Optional",
    `- Spanish version: ${SITE_URL}/es (${es.seo.homeTitle})`,
    `- Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
