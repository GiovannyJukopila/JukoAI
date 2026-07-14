import { usageSummary } from "@/server/services/usage/tracker";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/usage → API call counts + estimated cost by provider. */
export async function GET() {
  try {
    return ok(await usageSummary());
  } catch (err) {
    return handleError(err);
  }
}
