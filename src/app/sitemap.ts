import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { SERVICES, PROJECTS } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";

// Every public page in both languages, each with its hreflang alternates.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    { path: "", priority: 1 },
    { path: "/servicios", priority: 0.9 },
    ...SERVICES.map((s) => ({ path: `/servicios/${s.slug}`, priority: 0.8 })),
    { path: "/proyectos", priority: 0.8 },
    ...PROJECTS.map((p) => ({ path: `/proyectos/${p.slug}`, priority: 0.7 })),
  ];
  const now = new Date();
  return paths.flatMap(({ path, priority }) =>
    locales.map((l) => ({
      url: `${SITE_URL}/${l}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((x) => [x, `${SITE_URL}/${x}${path}`])) },
    }))
  );
}
