import { listSources } from "@/server/services/intel/repository";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/intel/sources → collector registry + health. */
export async function GET() {
  try {
    return ok({ sources: await listSources() });
  } catch (err) {
    return handleError(err);
  }
}
