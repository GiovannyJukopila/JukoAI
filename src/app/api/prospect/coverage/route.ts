import { listCoverage, getCountryProgress } from "@/server/services/coverage/service";
import { ok, handleError } from "@/server/lib/api";

// Reads the DB → always dynamic.
export const dynamic = "force-dynamic";

/** GET /api/prospect/coverage → full ledger + aggregated per-country progress. */
export async function GET() {
  try {
    const [coverage, progress] = await Promise.all([listCoverage(), getCountryProgress()]);
    return ok({ coverage, progress });
  } catch (err) {
    return handleError(err);
  }
}
