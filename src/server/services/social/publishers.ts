/**
 * Publishers reales por plataforma (Fase 4.7). Cada uno toma la cuenta
 * conectada (token fresco) y un post, y devuelve el id externo.
 *
 * Estado actual (docs/SOCIAL_APIS.md):
 *  - linkedin: texto (y link en el cuerpo) a perfil propio vía /rest/posts.
 *  - instagram: imagen o video/reel por URL pública (IG no admite posts sin media).
 *  - youtube / tiktok / x: pendientes (audit / decisión de pago) → error claro.
 */
import { getFreshAccessToken } from "@/server/services/social/accounts";
import type { SocialPlatform } from "@/server/db/schema";

const LINKEDIN_VERSION = "202506";

export type PublishablePost = {
  id: number;
  platform: string;
  content: string;
  media: string[] | null;
};

export type PublishOutcome = { externalPostId: string | null };

export async function publishToPlatform(post: PublishablePost): Promise<PublishOutcome> {
  switch (post.platform as SocialPlatform) {
    case "linkedin":
      return publishLinkedIn(post);
    case "instagram":
      return publishInstagram(post);
    default:
      throw new Error(
        `Publicación directa en ${post.platform} no disponible todavía (ver docs/SOCIAL_APIS.md).`,
      );
  }
}

async function publishLinkedIn(post: PublishablePost): Promise<PublishOutcome> {
  const acc = await getFreshAccessToken("linkedin");
  const personUrn = (acc.meta as { personUrn?: string } | null)?.personUrn ?? `urn:li:person:${acc.externalId}`;
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${acc.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: post.content,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn posts HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  // El id del post llega en el header x-restli-id.
  return { externalPostId: res.headers.get("x-restli-id") };
}

async function publishInstagram(post: PublishablePost): Promise<PublishOutcome> {
  const acc = await getFreshAccessToken("instagram");
  const igUserId = (acc.meta as { igUserId?: string } | null)?.igUserId ?? acc.externalId;
  if (!igUserId) throw new Error("Cuenta de Instagram sin igUserId");
  const mediaUrl = post.media?.[0];
  if (!mediaUrl) throw new Error("Instagram requiere al menos una imagen o video (URL pública).");

  const isVideo = /\.(mp4|mov)(\?|$)/i.test(mediaUrl);
  const params = new URLSearchParams({ caption: post.content, access_token: acc.accessToken });
  if (isVideo) {
    params.set("media_type", "REELS");
    params.set("video_url", mediaUrl);
  } else {
    params.set("image_url", mediaUrl);
  }
  const containerRes = await fetch(`https://graph.instagram.com/v23.0/${igUserId}/media?${params.toString()}`, { method: "POST" });
  if (!containerRes.ok) throw new Error(`IG media HTTP ${containerRes.status}: ${(await containerRes.text()).slice(0, 300)}`);
  const { id: creationId } = (await containerRes.json()) as { id: string };

  // Los videos procesan asíncrono: esperar hasta ~60 s a que el container esté listo.
  if (isVideo) {
    for (let i = 0; i < 12; i++) {
      const st = await fetch(
        `https://graph.instagram.com/v23.0/${creationId}?fields=status_code&access_token=${encodeURIComponent(acc.accessToken)}`,
      );
      const d = (await st.json()) as { status_code?: string };
      if (d.status_code === "FINISHED") break;
      if (d.status_code === "ERROR") throw new Error("IG: el procesamiento del video falló");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  const pubRes = await fetch(
    `https://graph.instagram.com/v23.0/${igUserId}/media_publish?creation_id=${creationId}&access_token=${encodeURIComponent(acc.accessToken)}`,
    { method: "POST" },
  );
  if (!pubRes.ok) throw new Error(`IG publish HTTP ${pubRes.status}: ${(await pubRes.text()).slice(0, 300)}`);
  const { id } = (await pubRes.json()) as { id: string };
  return { externalPostId: id };
}
