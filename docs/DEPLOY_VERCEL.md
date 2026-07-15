# Deploy a Vercel + Neon (BD) — guía

> Objetivo: el panel accesible para ambos hermanos vía Vercel (gratis) con la
> BD en Neon (gratis, la BD pesa ~39 MB de 512 MB del free tier).
> El **Refresh del Radar IA** solo funciona desde la Mac de Gio (ejecuta
> `claude -p` con su suscripción) — está restringido por `RADAR_REFRESH_USERS`
> y Yango ve el último escaneo cacheado.

## 1. Crear la BD en Neon (2 min — lo hace Gio)

Opción A (recomendada, integrada): dashboard de Vercel → proyecto → **Storage**
→ **Create Database** → **Neon (Postgres)** → región `us-east` (la más cercana
a Colombia). Vercel inyecta `DATABASE_URL` automáticamente al proyecto.

Opción B: [neon.tech](https://neon.tech) → New Project → copiar la
**connection string** (formato `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`).

## 2. Migrar los datos (lo hace Claude con la connection string)

```bash
# dump ya generado; restaurar usando el psql del contenedor local:
docker exec -i juko-prospect-db psql "<NEON_DATABASE_URL>" < backup.sql
# verificación: contar filas clave (businesses ≈ 22k, zones, tasks, goals…)
```

## 3. Variables de entorno en Vercel (Settings → Environment Variables)

Copiar los valores desde `.env.local` de la Mac de Gio:

| Variable | Valor | Nota |
|---|---|---|
| `DATABASE_URL` | connection string de Neon | automática si usaste la Opción A |
| `AUTH_USERS` | (desde .env.local) | **crítico: sin esto el panel queda SIN login** |
| `AUTH_SECRET` | (desde .env.local) | mismo valor para que las sesiones existentes sigan válidas |
| `SOCIAL_TOKEN_KEY` | (desde .env.local) | mismo valor o los tokens sociales guardados no descifran |
| `APP_BASE_URL` | `https://<dominio>.vercel.app` | los redirect de OAuth social dependen de esto |
| `DEFAULT_REFRESH_DAYS` | `90` | opcional |
| OAuth social (cuando existan) | `LINKEDIN_CLIENT_ID/SECRET`, `INSTAGRAM_APP_ID/SECRET`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` | añadir el redirect URI de producción en cada app |

**NO configurar en Vercel:** `GOOGLE_MAPS_API_KEY` / `PAGESPEED_API_KEY`
(las funciones de pago están apagadas por `ENABLE_BUSINESS_AUDIT=false`),
ni `ANTHROPIC_API_KEY` (los agentes usan la suscripción, no la API).

## 4. La Mac de Gio apunta a la misma BD

En `.env.local` local, cambiar `DATABASE_URL` a la de Neon. Así:
- Gio refresca el Radar desde su Mac → Yango lo ve al instante en Vercel.
- Docker local (`npm run db:up`) queda solo como backup/desarrollo.

## 5. Redeploy y verificación

1. Vercel → Deployments → Redeploy (o push a `main`).
2. Verificar: `https://<dominio>/prospect` pide login; entrar con cada usuario;
   Negocios/Tareas/Goals/Notificaciones cargan; el botón de Radar solo lo ve Gio.

## Qué funciona distinto en Vercel

| Funciona | No funciona (por diseño/plataforma) |
|---|---|
| Todo el panel, notificaciones, kanban, goals, Social Studio (OAuth + publicar) | Refresh del Radar (solo Mac de Gio); scripts CLI (`scrape`/`audit` — apagados igualmente) |
