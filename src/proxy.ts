import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";

function detectLocale(req: NextRequest): string {
  const header = req.headers.get("accept-language") ?? "";
  const preferred = header.split(",")[0]?.split("-")[0]?.toLowerCase();
  return (locales as readonly string[]).includes(preferred ?? "") ? (preferred as string) : defaultLocale;
}

/**
 * Auth gate for the internal tool. Active only when AUTH_USERS + AUTH_SECRET are
 * configured (so local dev stays open). The login page and the auth endpoints are
 * exempt. Unauthenticated requests → login redirect (pages) or 401 (API).
 */
async function guardProspect(req: NextRequest): Promise<NextResponse> {
  const users = process.env.AUTH_USERS;
  const secret = process.env.AUTH_SECRET;
  if (!users || !secret) return NextResponse.next(); // auth disabled

  const { pathname } = req.nextUrl;
  if (pathname === "/prospect/login" || pathname.startsWith("/api/prospect/auth/")) {
    return NextResponse.next();
  }

  const user = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret);
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/prospect")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/prospect/login";
  url.search = `?from=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Internal tool → auth gate.
  if (pathname.startsWith("/prospect") || pathname.startsWith("/api/prospect")) {
    return guardProspect(req);
  }

  // Marketing site → locale handling.
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on the marketing site, the /prospect tool and /api/prospect (for the auth
  // gate). Skip Next internals and static files. Other /api paths aren't used.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
