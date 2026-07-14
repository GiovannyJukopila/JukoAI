/**
 * OAuth de Social Studio (Fase 4.3) — plataformas de menor fricción primero
 * (ver docs/SOCIAL_APIS.md): LinkedIn (Share on LinkedIn, self-serve) e
 * Instagram (Instagram API with Instagram Login; cuentas propias como testers
 * de la app Meta → sin app review). YouTube/TikTok llegan tras sus audits; X
 * está pendiente de aprobación por ser de pago.
 */
import { env, requireKey } from "@/server/config/env";
import type { SocialPlatform } from "@/server/db/schema";
import { upsertConnectedAccount } from "@/server/services/social/accounts";

export const OAUTH_PLATFORMS: SocialPlatform[] = ["linkedin", "instagram", "youtube", "tiktok"];

/** Cookie httpOnly con el state anti-CSRF del flujo en curso. */
export const OAUTH_STATE_COOKIE = "social_oauth_state";

export function redirectUri(platform: SocialPlatform): string {
  return `${env.APP_BASE_URL}/api/prospect/social/callback/${platform}`;
}

/** URL de autorización del proveedor (state anti-CSRF lo pone la ruta). */
export function authorizeUrl(platform: SocialPlatform, state: string): string {
  if (platform === "linkedin") {
    const id = requireKey(env.LINKEDIN_CLIENT_ID, "LINKEDIN_CLIENT_ID");
    const p = new URLSearchParams({
      response_type: "code",
      client_id: id,
      redirect_uri: redirectUri("linkedin"),
      state,
      scope: "openid profile w_member_social",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${p.toString()}`;
  }
  if (platform === "instagram") {
    const id = requireKey(env.INSTAGRAM_APP_ID, "INSTAGRAM_APP_ID");
    const p = new URLSearchParams({
      client_id: id,
      redirect_uri: redirectUri("instagram"),
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_content_publish",
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${p.toString()}`;
  }
  if (platform === "youtube") {
    const id = requireKey(env.GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID");
    const p = new URLSearchParams({
      client_id: id,
      redirect_uri: redirectUri("youtube"),
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline", // refresh_token
      prompt: "consent", // fuerza refresh_token también en reconexiones
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
  }
  if (platform === "tiktok") {
    const key = requireKey(env.TIKTOK_CLIENT_KEY, "TIKTOK_CLIENT_KEY");
    const p = new URLSearchParams({
      client_key: key,
      response_type: "code",
      // video.upload = subir borradores a la bandeja (no requiere audit);
      // video.publish (post directo) se añade cuando pase el audit.
      scope: "user.info.basic,video.upload",
      redirect_uri: redirectUri("tiktok"),
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${p.toString()}`;
  }
  throw new Error(`OAuth no implementado para ${platform} (ver docs/SOCIAL_APIS.md)`);
}

async function postForm<T>(url: string, form: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url.split("?")[0]} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

/** Intercambia el code, obtiene perfil y guarda la cuenta con tokens cifrados. */
export async function handleCallback(platform: SocialPlatform, code: string) {
  if (platform === "linkedin") {
    const tok = await postForm<{ access_token: string; expires_in?: number; refresh_token?: string; scope?: string }>(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri("linkedin"),
        client_id: requireKey(env.LINKEDIN_CLIENT_ID, "LINKEDIN_CLIENT_ID"),
        client_secret: requireKey(env.LINKEDIN_CLIENT_SECRET, "LINKEDIN_CLIENT_SECRET"),
      },
    );
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!meRes.ok) throw new Error(`LinkedIn userinfo HTTP ${meRes.status}`);
    const me = (await meRes.json()) as { sub: string; name?: string; picture?: string };
    return upsertConnectedAccount({
      platform: "linkedin",
      accountName: me.name ?? "LinkedIn",
      externalId: me.sub,
      handle: me.name ?? null,
      avatarUrl: me.picture ?? null,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresInSeconds: tok.expires_in ?? null,
      scopes: tok.scope ?? "openid profile w_member_social",
      meta: { personUrn: `urn:li:person:${me.sub}` },
    });
  }

  if (platform === "instagram") {
    const appId = requireKey(env.INSTAGRAM_APP_ID, "INSTAGRAM_APP_ID");
    const secret = requireKey(env.INSTAGRAM_APP_SECRET, "INSTAGRAM_APP_SECRET");
    const shortTok = await postForm<{ access_token: string; user_id: string | number }>(
      "https://api.instagram.com/oauth/access_token",
      {
        client_id: appId,
        client_secret: secret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri("instagram"),
        code,
      },
    );
    // Canjear por token long-lived (60 días, refrescable).
    const longTok = await getJson<{ access_token: string; expires_in?: number }>(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(shortTok.access_token)}`,
    );
    const me = await getJson<{ user_id?: string; username?: string; profile_picture_url?: string }>(
      `https://graph.instagram.com/v23.0/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(longTok.access_token)}`,
    );
    return upsertConnectedAccount({
      platform: "instagram",
      accountName: me.username ?? "Instagram",
      externalId: String(me.user_id ?? shortTok.user_id),
      handle: me.username ? `@${me.username}` : null,
      avatarUrl: me.profile_picture_url ?? null,
      accessToken: longTok.access_token,
      expiresInSeconds: longTok.expires_in ?? 60 * 24 * 3600,
      scopes: "instagram_business_basic,instagram_business_content_publish",
      meta: { igUserId: String(me.user_id ?? shortTok.user_id) },
    });
  }

  if (platform === "youtube") {
    const tok = await postForm<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: requireKey(env.GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID"),
        client_secret: requireKey(env.GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET"),
        redirect_uri: redirectUri("youtube"),
        grant_type: "authorization_code",
      },
    );
    // Canal propio para nombre y avatar.
    const chRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!chRes.ok) throw new Error(`YouTube channels HTTP ${chRes.status}`);
    const ch = (await chRes.json()) as {
      items?: { id: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }[];
    };
    const channel = ch.items?.[0];
    return upsertConnectedAccount({
      platform: "youtube",
      accountName: channel?.snippet?.title ?? "YouTube",
      externalId: channel?.id ?? null,
      handle: channel?.snippet?.title ?? null,
      avatarUrl: channel?.snippet?.thumbnails?.default?.url ?? null,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresInSeconds: tok.expires_in ?? 3600,
      scopes: tok.scope ?? "youtube.upload youtube.readonly",
      meta: { channelId: channel?.id ?? null },
    });
  }

  if (platform === "tiktok") {
    const tok = await postForm<{
      access_token: string; refresh_token?: string; expires_in?: number; open_id?: string; scope?: string;
    }>("https://open.tiktokapis.com/v2/oauth/token/", {
      client_key: requireKey(env.TIKTOK_CLIENT_KEY, "TIKTOK_CLIENT_KEY"),
      client_secret: requireKey(env.TIKTOK_CLIENT_SECRET, "TIKTOK_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri("tiktok"),
    });
    const meRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const me = meRes.ok
      ? ((await meRes.json()) as { data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } } }).data?.user
      : undefined;
    return upsertConnectedAccount({
      platform: "tiktok",
      accountName: me?.display_name ?? "TikTok",
      externalId: me?.open_id ?? tok.open_id ?? null,
      handle: me?.display_name ? `@${me.display_name}` : null,
      avatarUrl: me?.avatar_url ?? null,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresInSeconds: tok.expires_in ?? 86400, // access token de TikTok dura 24 h
      scopes: tok.scope ?? "user.info.basic,video.upload",
      meta: { openId: me?.open_id ?? tok.open_id ?? null },
    });
  }

  throw new Error(`OAuth no implementado para ${platform}`);
}
