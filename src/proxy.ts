import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";
import { REGION_COOKIE, regionFromCountry } from "@/lib/region-data";

function detectLocale(req: NextRequest): string {
  const header = req.headers.get("accept-language") ?? "";
  const preferred = header.split(",")[0]?.split("-")[0]?.toLowerCase();
  return (locales as readonly string[]).includes(preferred ?? "") ? (preferred as string) : defaultLocale;
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

  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return withRegion(req, NextResponse.next());

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Every page; skip Next internals and static files.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
