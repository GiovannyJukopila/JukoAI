import { listOperations } from "@/server/services/ai/repository";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/operations → recent pipeline runs + per-agent task status. */
export async function GET() {
  try {
    return ok({ runs: await listOperations() });
  } catch (err) {
    return handleError(err);
  }
}
