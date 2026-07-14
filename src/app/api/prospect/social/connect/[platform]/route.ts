import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorizeUrl, OAUTH_PLATFORMS, OAUTH_STATE_COOKIE } from "@/server/services/social/oauth";
import type { SocialPlatform } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/prospect/social/connect/:platform → redirect al proveedor OAuth. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  if (!OAUTH_PLATFORMS.includes(platform as SocialPlatform)) {
    return NextResponse.redirect(new URL(`/prospect/social?error=platform_no_disponible`, req.url));
  }
  try {
    const state = randomBytes(16).toString("hex");
    const res = NextResponse.redirect(authorizeUrl(platform as SocialPlatform, state));
    res.cookies.set(OAUTH_STATE_COOKIE, `${platform}:${state}`, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/api/prospect/social",
    });
    return res;
  } catch (err) {
    // Falta de credenciales (requireKey) u otros errores de config → volver con mensaje.
    const msg = encodeURIComponent((err as Error).message);
    return NextResponse.redirect(new URL(`/prospect/social?error=${msg}`, req.url));
  }
}
