/**
 * Resolve the logged-in user inside route handlers / server components.
 * Separate from session.ts so that file stays importable from the Edge proxy
 * (next/headers is only for the Node rendering/runtime context).
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, authEnabled, parseUsers } from "@/server/auth/session";

/** Username of the current session, or "dev" when auth isn't configured. */
export async function currentUser(): Promise<string | null> {
  if (!authEnabled()) return "dev";
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET ?? "");
}

/** All configured usernames (to notify "the other user" on task/goal events). */
export function allUsers(): string[] {
  const users = [...parseUsers(process.env.AUTH_USERS).keys()];
  return users.length ? users : ["dev"];
}
