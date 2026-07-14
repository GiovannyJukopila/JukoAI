import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/prospect/auth/logout → clear the session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
