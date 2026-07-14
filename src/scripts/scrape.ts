/**
 * CLI / cron entrypoint for scraping one (zone × category).
 *
 * Usage:
 *   npm run scrape -- --country "Malta" --zone "St. Julian's" --category restaurants
 *   npm run scrape -- --country "Malta" --zone "Sliema" --category hotels --force
 *
 * Flags:
 *   --country   (required) e.g. "Malta"
 *   --zone      (required) e.g. "St. Julian's"
 *   --category  (required) category id (see config/categories) or free-text query
 *   --force     refresh even if the zone was evaluated recently
 *   --maxPages  override max result pages (default 3 ≈ 60 results)
 */
import "@/server/config/load-env";
import { scrapeZoneCategory } from "@/server/services/places/search";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const country = arg("country");
  const zone = arg("zone");
  const category = arg("category");
  const maxPages = arg("maxPages") ? Number(arg("maxPages")) : undefined;

  if (!country || !zone || !category) {
    console.error(
      "Faltan argumentos. Uso:\n" +
        '  npm run scrape -- --country "Malta" --zone "St. Julian\'s" --category restaurants [--force] [--maxPages 3]',
    );
    process.exit(2);
  }

  const city = arg("city");
  console.log(`Scraping «${category}» en ${[zone, city, country].filter(Boolean).join(", ")}…`);
  const r = await scrapeZoneCategory({
    country,
    zone,
    category,
    city,
    force: flag("force"),
    thorough: flag("thorough"),
    maxPages,
  });

  if (!r.ran) {
    console.log(`⏭  No se ejecutó (${r.decision.action}): ${r.decision.message}`);
    process.exit(0);
  }

  console.log(
    `✅ Estado: ${r.status} · nuevos: ${r.created} · actualizados: ${r.updated} · ` +
      `total: ${r.total} · llamadas API: ${r.apiCalls}`,
  );
  if (r.error) console.log(`⚠️  ${r.error}`);
  process.exit(r.status === "error" ? 1 : 0);
}

main().catch((e) => {
  console.error("Scrape falló:", e);
  process.exit(1);
});
