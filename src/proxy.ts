import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";
import { REGION_COOKIE, regionFromCountry } from "@/lib/region-data";

function detectLocale(req: NextRequest): string {
  const header = req.headers.get("accept-language") ?? "";
  const preferred = header.split(",")[0]?.split("-")[0]?.toLowerCase();
  return (locales as readonly string[]).includes(preferred ?? "") ? (preferred as string) : defaultLocale;
}

/**
 * Auth gate for the internal tool. Without AUTH_USERS + AUTH_SECRET it stays open only in
 * local dev; a production deployment without them hides the tool and its API (404), so a
 * missing variable can never expose the leads data or spend the Anthropic / Google keys.
 * The login page and the auth endpoints are exempt. Unauthenticated requests → login
 * redirect (pages) or 401 (API).
 */
async function guardProspect(req: NextRequest): Promise<NextResponse> {
  const users = process.env.AUTH_USERS;
  const secret = process.env.AUTH_SECRET;
  if (!users || !secret) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next(); // local dev
    return req.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Not found" }, { status: 404 })
      : new NextResponse("Not found", { status: 404 });
  }

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

/**
 * The visitor's region for the WhatsApp number (lib/region.ts), from the country the hosting
 * network adds to the request (Vercel, Cloudflare). No geo API, no keys; without the header the
 * browser falls back to the device time zone.
 */
function withRegion(req: NextRequest, res: NextResponse): NextResponse {
  const country = req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? req.headers.get("x-country-code");
  if (!country || country === "XX") return res;
  const region = regionFromCountry(country);
  if (req.cookies.get(REGION_COOKIE)?.value !== region) {
    res.cookies.set(REGION_COOKIE, region, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
  }
  return res;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Internal tool → auth gate.
  if (pathname.startsWith("/prospect") || pathname.startsWith("/api/prospect")) {
    return guardProspect(req);
  }

  // Marketing site → locale handling.
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return withRegion(req, NextResponse.next());

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
