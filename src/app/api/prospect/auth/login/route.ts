import { NextResponse, type NextRequest } from "next/server";
import { signSession, verifyCredentials, SESSION_COOKIE } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** POST /api/prospect/auth/login { username, password } → set session cookie. */
export async function POST(req: NextRequest) {
  const usersEnv = process.env.AUTH_USERS;
  const secret = process.env.AUTH_SECRET;
  if (!usersEnv || !secret) {
    return NextResponse.json({ error: "Autenticación no configurada en el servidor." }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!verifyCredentials(username, password, usersEnv)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }
  const token = await signSession(username, secret);
  const res = NextResponse.json({ ok: true, user: username });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
