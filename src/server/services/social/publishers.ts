/**
 * Publishers reales por plataforma (Fase 4.7). Cada uno toma la cuenta
 * conectada (token fresco) y un post, y devuelve el id externo.
 *
 * Estado actual (docs/SOCIAL_APIS.md):
 *  - linkedin: texto (y link en el cuerpo) a perfil propio vía /rest/posts.
 *  - instagram: imagen o video/reel por URL pública (IG no admite posts sin media).
 *  - youtube: sube el video como PRIVADO (audit de Google pendiente) — se
 *    publica a mano desde YouTube Studio.
 *  - tiktok: sube el video como BORRADOR a la bandeja de la app (scope
 *    video.upload, sin audit) — se termina de publicar dentro de TikTok.
 *  - x: pendiente de decisión (API de pago) → error claro.
 */
import { getFreshAccessToken } from "@/server/services/social/accounts";
import type { SocialPlatform } from "@/server/db/schema";

const LINKEDIN_VERSION = "202506";
const VIDEO_RE = /\.(mp4|mov|webm)(\?|$)/i;
// TikTok permite un solo chunk de hasta 64 MB; usamos ese mismo tope para
// no cargar archivos gigantes en memoria (suficiente para clips de social).
const MAX_MEDIA_BYTES = 64 * 1024 * 1024;

/** Descarga la media a memoria con tope de tamaño y errores claros. */
async function downloadMedia(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar la media (HTTP ${res.status}): ${url.slice(0, 120)}`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_MEDIA_BYTES) throw new Error(`Video demasiado grande (${Math.round(declared / 1048576)} MB > 64 MB).`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > MAX_MEDIA_BYTES) throw new Error(`Video demasiado grande (>64 MB).`);
  return { bytes, contentType: res.headers.get("content-type") ?? "video/mp4" };
}

/** Primer video del post (YouTube/TikTok solo aceptan video). */
function firstVideoUrl(post: PublishablePost): string {
  const url = post.media?.find((m) => VIDEO_RE.test(m));
  if (!url) throw new Error("Se requiere un video (URL .mp4/.mov) en la media del post.");
  return url;
}

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
    case "youtube":
      return publishYouTube(post);
    case "tiktok":
      return publishTikTok(post);
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

/**
 * YouTube — resumable upload de videos.insert. Sin audit de Google el proyecto
 * solo puede subir como PRIVADO: el video queda listo en YouTube Studio para
 * publicarlo a mano. Título = primera línea del contenido; descripción = todo.
 */
async function publishYouTube(post: PublishablePost): Promise<PublishOutcome> {
  const acc = await getFreshAccessToken("youtube");
  const videoUrl = firstVideoUrl(post);
  const { bytes, contentType } = await downloadMedia(videoUrl);

  const firstLine = post.content.split("\n")[0]?.trim() || "Video de Juko";
  const metadata = {
    snippet: { title: firstLine.slice(0, 95), description: post.content.slice(0, 4900) },
    status: { privacyStatus: "private", selfDeclaredMadeForKids: false },
  };

  // Paso 1: iniciar la sesión resumable → header Location con la URL de subida.
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${acc.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(bytes.byteLength),
        "X-Upload-Content-Type": contentType,
      },
      body: JSON.stringify(metadata),
    },
  );
  if (!initRes.ok) throw new Error(`YouTube init HTTP ${initRes.status}: ${(await initRes.text()).slice(0, 300)}`);
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube no devolvió la URL de subida (Location).");

  // Paso 2: subir los bytes.
  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, "Content-Length": String(bytes.byteLength) },
    body: new Uint8Array(bytes),
  });
  if (!upRes.ok) throw new Error(`YouTube upload HTTP ${upRes.status}: ${(await upRes.text()).slice(0, 300)}`);
  const video = (await upRes.json()) as { id?: string };
  return { externalPostId: video.id ?? null };
}

/**
 * TikTok — Content Posting API en modo inbox (scope video.upload, sin audit):
 * el video llega como notificación a la bandeja de TikTok del usuario, que
 * termina la publicación (caption, portada, privacidad) dentro de la app.
 * El caption del post queda en la BD para copiarlo al publicar.
 */
async function publishTikTok(post: PublishablePost): Promise<PublishOutcome> {
  const acc = await getFreshAccessToken("tiktok");
  const videoUrl = firstVideoUrl(post);
  const { bytes, contentType } = await downloadMedia(videoUrl);

  // Paso 1: init de la subida (un solo chunk ≤64 MB).
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${acc.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: bytes.byteLength,
        chunk_size: bytes.byteLength,
        total_chunk_count: 1,
      },
    }),
  });
  const initBody = (await initRes.json().catch(() => ({}))) as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };
  if (!initRes.ok || (initBody.error?.code && initBody.error.code !== "ok")) {
    throw new Error(`TikTok init HTTP ${initRes.status}: ${initBody.error?.message ?? ""}`.trim());
  }
  const { publish_id: publishId, upload_url: uploadUrl } = initBody.data ?? {};
  if (!publishId || !uploadUrl) throw new Error("TikTok no devolvió publish_id/upload_url.");

  // Paso 2: PUT del video completo con Content-Range.
  const upRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType.startsWith("video/") ? contentType : "video/mp4",
      "Content-Length": String(bytes.byteLength),
      "Content-Range": `bytes 0-${bytes.byteLength - 1}/${bytes.byteLength}`,
    },
    body: new Uint8Array(bytes),
  });
  if (!upRes.ok) throw new Error(`TikTok upload HTTP ${upRes.status}: ${(await upRes.text()).slice(0, 200)}`);
  return { externalPostId: publishId };
}
