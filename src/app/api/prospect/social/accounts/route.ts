import { listAccounts } from "@/server/services/social/accounts";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/social/accounts → cuentas (sin tokens). */
export async function GET() {
  try {
    return ok({ accounts: await listAccounts() });
  } catch (err) {
    return handleError(err);
  }
}
