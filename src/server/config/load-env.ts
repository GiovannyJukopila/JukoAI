/**
 * Minimal .env loader for CLI scripts and drizzle-kit (zero dependency).
 *
 * Next.js loads .env.local automatically for the app, but standalone tooling
 * (tsx scripts, drizzle-kit) does not. Import this first in those entrypoints.
 * Precedence: existing process.env > .env.local > .env  (does not overwrite set vars).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadFile(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key in process.env) continue; // don't overwrite already-set vars
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// .env.local wins over .env, both lose to real environment variables.
loadFile(".env.local");
loadFile(".env");
