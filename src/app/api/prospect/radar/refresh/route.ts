import { runRadar } from "@/server/services/radar/runner";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// El agente hace varias búsquedas web vía claude -p: puede tardar minutos.
export const maxDuration = 300;

/** POST /api/prospect/radar/refresh → ejecuta el agente (manual, nunca automático). */
export async function POST() {
  try {
    return ok(await runRadar());
  } catch (err) {
    return handleError(err);
  }
}
