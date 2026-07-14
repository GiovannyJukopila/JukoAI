import type { NextRequest } from "next/server";
import { listZones, ensureZone } from "@/server/services/coverage/service";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/zones → zone catalog (country + name) for the dropdowns. */
export async function GET() {
  try {
    return ok({ zones: await listZones() });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/prospect/zones { country, name, city? } → add a zone to the catalog. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const country = String(body?.country ?? "").trim();
    const name = String(body?.name ?? "").trim();
    if (!country || !name) return badRequest("Faltan country o name");
    const zone = await ensureZone({ country, name, city: body?.city ?? null, planned: true });
    return ok(zone, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
