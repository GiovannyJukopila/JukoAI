import { NextResponse } from "next/server";
import { runRadar } from "@/server/services/radar/runner";
import { ok, handleError } from "@/server/lib/api";
import { currentUser } from "@/server/auth/current-user";
import { RADAR_REFRESH_USERS } from "@/config/features";

export const dynamic = "force-dynamic";
// El agente hace varias búsquedas web vía claude -p: puede tardar minutos.
export const maxDuration = 300;

/**
 * POST /api/prospect/radar/refresh → ejecuta el agente (manual, nunca automático).
 * Restringido a RADAR_REFRESH_USERS: consume la suscripción Claude del dueño.
 */
export async function POST() {
  try {
    const user = await currentUser();
    if (!user || !RADAR_REFRESH_USERS.includes(user)) {
      return NextResponse.json(
        { error: "Solo el administrador puede refrescar el radar (consume su suscripción de Claude)." },
        { status: 403 },
      );
    }
    return ok(await runRadar());
  } catch (err) {
    return handleError(err);
  }
}
