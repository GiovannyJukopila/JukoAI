/**
 * Seed planned work zones so the dashboard's aggregate progress ("España: 0 de 10")
 * has a denominator before any scraping runs.
 *
 * Usage:
 *   npm run seed:zones                 # seeds the curated multi-country catalog below
 *   npm run seed:zones -- "México" "Polanco" "Condesa" "Roma Norte"
 *     → first arg = country, the rest = zone names (override; seeds just those)
 *
 * Idempotent: re-running does not duplicate zones (unique on country+name).
 *
 * Curation criteria — high potential to find clients for a Spanish-speaking
 * dev/AI-automation agency: (1) Spanish-speaking markets for easy outreach,
 * (2) Mediterranean tourism hubs full of SMBs with outdated sites,
 * (3) high-income, automation-receptive European markets.
 */
import "@/server/config/load-env";
import { ensureZone } from "@/server/services/coverage/service";

type ZoneSeed = { name: string; city?: string };

const CATALOG: Record<string, ZoneSeed[]> = {
  // ── Mercados en español (outreach/cierre más fácil) ──
  Malta: [
    { name: "St. Julian's" }, { name: "Sliema" }, { name: "Valletta" }, { name: "Gzira" },
    { name: "Msida" }, { name: "Birkirkara" }, { name: "St. Paul's Bay" }, { name: "Marsaskala" },
    { name: "Attard" }, { name: "Balzan" }, { name: "Birgu" }, { name: "Birżebbuġa" },
    { name: "Bormla" }, { name: "Dingli" }, { name: "Fgura" }, { name: "Għargħur" },
    { name: "Kalkara" }, { name: "Lija" }, { name: "Mdina" }, { name: "Mellieħa" },
    { name: "Mġarr" }, { name: "Mosta" }, { name: "Naxxar" }, { name: "Paola" },
    { name: "Rabat" }, { name: "Senglea" }, { name: "Tarxien" }, { name: "Żejtun" },
    { name: "Żurrieq" },
    // Isla de Gozo (agrupadas como barrios de la "ciudad" Gozo)
    { name: "Fontana", city: "Gozo" },
    { name: "Għarb", city: "Gozo" },
    { name: "San Lawrenz", city: "Gozo" },
  ],
  España: [
    { name: "Valencia" }, { name: "Sevilla" },
    { name: "Málaga" }, { name: "Marbella" }, { name: "Palma de Mallorca" }, { name: "Alicante" },
    { name: "Ibiza" }, { name: "Bilbao" },
    // Distritos premium de Madrid (alta densidad de negocios y poder adquisitivo)
    { name: "Salamanca", city: "Madrid" },
    { name: "Chamberí", city: "Madrid" },
    { name: "Chamartín", city: "Madrid" },
    { name: "Centro", city: "Madrid" },
    { name: "Retiro", city: "Madrid" },
    // Distritos clave de Barcelona
    { name: "Eixample", city: "Barcelona" },
    { name: "Gràcia", city: "Barcelona" },
    { name: "Sarrià-Sant Gervasi", city: "Barcelona" },
    { name: "Ciutat Vella", city: "Barcelona" },
    { name: "Poblenou", city: "Barcelona" },
  ],
  Colombia: [
    // Cartagena: los 128 barrios oficiales se cargan aparte con el import SQL
    //   src/server/db/seeds/cartagena-barrios.sql  (ciudad "Cartagena").
    // Distritos de Bogotá / Medellín
    { name: "Chapinero", city: "Bogotá" },
    { name: "Usaquén", city: "Bogotá" },
    { name: "Chicó", city: "Bogotá" },
    { name: "El Poblado", city: "Medellín" },
    { name: "Laureles", city: "Medellín" },
    // Otras ciudades (aún sin desglose por barrio)
    { name: "Cali" }, { name: "Barranquilla" }, { name: "Bucaramanga" },
  ],

  // ── Hubs turísticos del Mediterráneo (muchas PYMEs con webs anticuadas) ──
  Portugal: [
    { name: "Lisboa" }, { name: "Porto" }, { name: "Faro" }, { name: "Albufeira" },
    { name: "Cascais" }, { name: "Funchal" },
  ],
  Italia: [
    { name: "Milano" }, { name: "Roma" }, { name: "Firenze" }, { name: "Napoli" },
    { name: "Bologna" }, { name: "Venezia" },
  ],
  Francia: [
    { name: "Paris" }, { name: "Lyon" }, { name: "Marseille" }, { name: "Nice" },
    { name: "Cannes" }, { name: "Bordeaux" },
  ],

  // ── Alto poder adquisitivo / receptivos a IA ──
  Irlanda: [{ name: "Dublin" }, { name: "Cork" }, { name: "Galway" }, { name: "Limerick" }],
  "Países Bajos": [
    { name: "Amsterdam" }, { name: "Rotterdam" }, { name: "Eindhoven" }, { name: "Utrecht" }, { name: "La Haya" },
  ],
  Alemania: [
    { name: "Berlin" }, { name: "München" }, { name: "Hamburg" }, { name: "Frankfurt" }, { name: "Köln" },
  ],
  Suiza: [{ name: "Zürich" }, { name: "Genève" }, { name: "Lugano" }],
};

async function main() {
  const [, , countryArg, ...zoneArgs] = process.argv;

  if (countryArg) {
    // Override mode: seed just the provided country + zones.
    const names = zoneArgs.length ? zoneArgs : [];
    if (!names.length) {
      console.error('Indica zonas: npm run seed:zones -- "País" "Zona1" "Zona2"');
      process.exit(2);
    }
    console.log(`Seeding ${names.length} zonas para «${countryArg}»…`);
    for (const name of names) {
      const z = await ensureZone({ country: countryArg, name, planned: true });
      console.log(`  ✓ ${z.country} / ${z.name}`);
    }
    process.exit(0);
  }

  let total = 0;
  for (const [country, zonesList] of Object.entries(CATALOG)) {
    for (const z of zonesList) {
      await ensureZone({ country, name: z.name, city: z.city ?? null, planned: true });
      total++;
    }
    console.log(`  ✓ ${country.padEnd(14)} ${zonesList.length} zonas`);
  }
  console.log(`\nListo. ${total} zonas en ${Object.keys(CATALOG).length} países.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
