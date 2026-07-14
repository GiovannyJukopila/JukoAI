import { getLatestRadar } from "@/server/services/radar/runner";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/radar → último run cacheado con sus items (sin re-consultar). */
export async function GET() {
  try {
    return ok(await getLatestRadar());
  } catch (err) {
    return handleError(err);
  }
}
