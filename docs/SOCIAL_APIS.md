# Social Studio — Viabilidad de APIs por plataforma (Fase 4.1)

> Investigado: 2026-07-14. Contexto clave: herramienta **interna de 2 usuarios**
> que publica en **cuentas propias**. Eso cambia radicalmente la fricción: casi
> todos los "app review" de las plataformas aplican cuando publicas en nombre de
> *terceros*; para cuentas propias suele haber vía rápida (roles de tester/dev).

## Resumen ejecutivo

| Plataforma | ¿Publicable hoy? | Fricción | Costo | Nota clave |
|---|---|---|---|---|
| **LinkedIn** | ✅ Sí (perfil propio) | 🟢 Baja | Gratis | Producto "Share on LinkedIn" self-serve, scope `w_member_social`. Token dura 60 días (refresh 365). ~100 llamadas/día/miembro. Requiere vincular una Company Page al crear la app. |
| **Instagram (Meta)** | ✅ Sí (cuentas propias como testers) | 🟡 Media | Gratis | Cuenta **Professional** + página FB vinculada. En modo desarrollo, las cuentas con rol en la app (dev/tester) pueden usar `instagram_business_content_publish` **sin app review**. Review (2–4 semanas) solo para publicar en cuentas de terceros. Límite: 100 posts API/24h por cuenta. Sin stories API para no-terceros… (stories sí soportadas para professional). |
| **YouTube** | ✅ **Implementado** (sube como **privado**) | 🟡 Media | Gratis | OAuth + resumable upload listos. Sin audit de Google el video queda **privado** → publicar desde YouTube Studio. Audit de cumplimiento (2–4 semanas) para publicación pública directa. `videos.insert` ≈100 unidades (~100 uploads/día de cuota). |
| **TikTok** | ✅ **Implementado** (borrador a la **bandeja**) | 🟡 Media | Gratis | OAuth + upload listos en modo **inbox** (`video.upload`, sin audit): el video llega como notificación a la bandeja de TikTok y se termina de publicar en la app. Para post directo público: audit + scope `video.publish`. |
| **X (Twitter)** | ✅ Sí, pero **de pago** | 🟢 Baja (técnica) / 🔴 (costo) | 💸 **$0.015/post** ($0.20 si lleva link); sin free tier desde feb-2026 | Nuevos developers solo tienen pay-per-use. Técnicamente lo más simple (OAuth 2.0 + POST /2/tweets), pero **viola la restricción "no servicios de pago sin preguntar"** → decisión del usuario. |

## Detalle por plataforma

### 1. LinkedIn — empezar por aquí 🟢
- App en el Developer Portal + producto **"Share on LinkedIn"** (self-serve, sin review) + **"Sign In with LinkedIn (OpenID)"**.
- OAuth 2.0 → scope `w_member_social` → `POST /rest/posts` (texto, imagen, video a perfil personal).
- Límites: ~100 llamadas/día por miembro; token 60 días (implementar refresh).
- Único trámite: la app debe asociarse a una Company Page (Juko ya tiene o se crea en 2 min).

### 2. Instagram (Meta Graph API) 🟡
- Requisitos por cuenta: IG **Professional** (Business/Creator) vinculada a página de Facebook.
- App Meta en **modo desarrollo**: añadir a los 2 hermanos con rol (admin/dev/tester) → `instagram_business_basic` + `instagram_business_content_publish` funcionan para esas cuentas **sin pasar app review**.
- Flujo de publicación: crear *media container* → `media_publish`. Feed, Reels y carruseles. 100 publicaciones/24 h por cuenta.
- App review (2–4 semanas, screencast) **solo si** algún día se publica en cuentas ajenas.

### 3. YouTube (Data API v3) 🟡
- OAuth con scope `youtube.upload`; proyecto GCP con la API habilitada.
- Cuota: `videos.insert` ≈ 100 unidades (desde dic-2025) → ~100 uploads/día por defecto — de sobra.
- **Limitación dura**: proyecto sin audit → todos los uploads quedan **privados**. Útil como "subir borrador y publicar a mano desde YouTube Studio". Para publicación pública directa: audit de cumplimiento (formulario + demo del OAuth, 2–4 semanas).
- Como app en modo *testing* (usuarios de prueba = los 2 hermanos) no hay problema del límite de 100 usuarios.

### 4. TikTok (Content Posting API) 🔴
- Sin audit: 5 usuarios máx., la cuenta debe estar **privada** y el contenido queda `SELF_ONLY` (invisible). Solo sirve para probar la integración.
- Con audit aprobado (`video.publish`): publicación directa pública. El audit es viable para una app pequeña pero tarda días–semanas y exige cumplir guidelines.
- Recomendación: implementar OAuth + draft upload al final, y solicitar el audit en paralelo.

### 5. X (API v2) 💸
- Desde 06-feb-2026 no existe free tier para nuevos developers: **pay-per-use** $0.015 por post ($0.20 con link), lectura $0.005.
- Técnicamente trivial (`POST /2/tweets` + OAuth 2.0 PKCE). Volumen esperado (2 usuarios, ~5-10 posts/día) ≈ **$3–6/mes**.
- ⛔ Restricción global #3 del plan: es un servicio de pago nuevo → **requiere aprobación explícita antes de implementarlo**.

## Alternativa transversal: agregadores tipo Blotato

Servicios que ya pasaron todos los app reviews y exponen una sola API (Blotato ~$29–97/mes, Ayrshare, Post Bridge, upload-post…). Pros: cero trámites, todas las redes de una vez. Contras: **costo mensual** (→ también requiere aprobación), lock-in, y el contenido pasa por un tercero. Postiz (open-source, self-hosted) es gratis pero igual exige crear las apps por plataforma, así que no elimina la fricción.

## Cómo pasar los audits de YouTube y TikTok (para publicación pública directa)

Ambas integraciones ya funcionan en modo sin-audit (YouTube = privado, TikTok = borrador). Para quitar esa limitación:

**YouTube (audit de cumplimiento de Google):**
1. En Google Cloud Console → "OAuth consent screen" → publicar la app (salir de modo testing).
2. Solicitar verificación de la marca + **YouTube API Services compliance audit**: formulario en https://support.google.com/youtube/contact/yt_api_form — describir el caso de uso (herramienta interna que sube videos propios), adjuntar demo del flujo OAuth.
3. Tiempo típico: 2–4 semanas. Al aprobarse, los uploads pueden ser `public`/`unlisted` (cambiar `privacyStatus` en `publishers.ts`).

**TikTok (app audit):**
1. En developers.tiktok.com → tu app → añadir el scope `video.publish` (Direct Post) → "Submit for review".
2. Requisitos: descripción del caso de uso, video demo del flujo completo, cumplir las [content sharing guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines).
3. Al aprobarse: cambiar el scope en `oauth.ts` (`video.upload` → añadir `video.publish`), reconectar la cuenta, y cambiar el publisher del modo inbox a Direct Post (`/v2/post/publish/video/init/` con `post_info`).

## Plan de implementación propuesto (orden por fricción)

1. **LinkedIn** — OAuth + publicación directa. Sin trámites. *(4.3 empieza aquí)*
2. **Instagram** — app Meta en modo dev con las 2 cuentas como testers. Sin review.
3. **YouTube** — OAuth + upload privado ("borrador"); decidir si se pide el audit para publicación pública.
4. **TikTok** — OAuth + draft; solicitar audit en paralelo; activar publicación pública cuando lo aprueben.
5. **X** — ⏸️ pendiente de decisión del usuario (servicio de pago).

Infra común (4.2–4.4): tablas `social_accounts`/`social_posts` ya existen en el schema (revisar y extender), tokens cifrados en BD (AES-256-GCM con clave en env), refresh automático por plataforma, compositor con previews y programación con cola (poll del servidor cada minuto — sin cron externo).

## Fuentes

- [Postproxy — Post to Instagram via API (2026)](https://postproxy.dev/blog/post-to-instagram-via-api/) · [Storrito — Instagram API Changes 2026](https://storrito.com/resources/instagram-api-2026/) · [Phyllo — Instagram API Integration](https://www.getphyllo.com/post/instagram-api-integration-101-for-developers-of-the-creator-economy)
- [TikTok — Content Posting API (docs oficiales)](https://developers.tiktok.com/doc/content-posting-api-get-started) · [TikTok — Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [Postproxy — X API Pricing 2026](https://postproxy.dev/blog/x-api-pricing-2026/) · [xpoz — Twitter API pricing tiers](https://www.xpoz.ai/blog/guides/understanding-twitter-api-pricing-tiers-and-alternatives/) · [SocialCrawl — The X API in 2026](https://www.socialcrawl.dev/blog/x-twitter-api-2026)
- [Google — videos.insert (docs oficiales)](https://developers.google.com/youtube/v3/docs/videos/insert) · [Postproxy — YouTube Upload API 2026](https://postproxy.dev/blog/youtube-upload-api-guide/)
- [Microsoft Learn — LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-06) · [Zernio — LinkedIn Posting API 2026](https://zernio.com/blog/linkedin-posting-api)
