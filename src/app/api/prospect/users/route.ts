import { allUsers, currentUser } from "@/server/auth/current-user";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/users → usernames configurados + el de la sesión. */
export async function GET() {
  try {
    return ok({ users: allUsers(), me: await currentUser() });
  } catch (err) {
    return handleError(err);
  }
}
