# Juko Prospect — Herramienta interna de prospección B2B

Herramienta **de uso interno** para encontrar negocios con webs anticuadas/lentas/sin
automatización (leads de "presa fácil"), auditarlos automáticamente y priorizarlos en un
dashboard. Construida **dentro de la app `juko-web`** (Next.js 16) para compartir un solo
stack, tipos y deploy.

> Empezó enfocada en **Malta** pero soporta **cualquier país/ciudad** sin tocar código.
> La unidad de trabajo siempre es **zona × categoría** (nunca un país entero de golpe).

---

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind 4**
- **PostgreSQL 16** en **Docker** · **Drizzle ORM** (mismo esquema portable a Postgres gestionado)
- Scraping/auditoría como **scripts CLI** (`tsx`) que comparten la capa de servicios
- **Fase 2 (agentes IA):** Anthropic Claude (modelo por defecto `claude-sonnet-4-6`)

---

## Arquitectura

```
src/
  app/prospect/            # Dashboard interno (root layout propio, NO localizado)
    leads/ · coverage/ · leads/[id]/
  app/api/prospect/        # Route Handlers (coverage, scrape, leads, audit, usage…)
  server/
    db/        schema.ts · client.ts · migrations/
    services/
      coverage/  # Sección 0: control de zonas (evita gastar cuota repetida)
      places/    # Google Places API (New) — Text Search
      audit/     # PageSpeed + detectores HTML + score de oportunidad
      leads/     # repositorio (dedup por place_id, lecturas del dashboard)
      usage/     # log de uso/costo de APIs
    config/    env.ts (validado con zod) · categories.ts
    lib/       http.ts (timeout/retry/rate-limit) · errors.ts · api.ts
  scripts/     scrape.ts · audit.ts · seed-zones.ts
docker-compose.yml · drizzle.config.ts · PROGRESS.md
```

---

## Puesta en marcha (local)

Requisitos: **Node 22+**, **Docker** corriendo.

```bash
# 1. Dependencias
npm install

# 2. Levantar Postgres (puerto host 5433)
npm run db:up

# 3. Aplicar migraciones (crea las 13 tablas)
npm run db:migrate

# 4. Variables de entorno
cp .env.example .env.local   # y rellena las API keys (ver abajo)

# 5. Precargar zonas planificadas (por defecto 8 zonas de Malta)
npm run seed:zones
#   o para otro país:  npm run seed:zones -- "México" "Polanco" "Condesa" "Roma Norte"

# 6. Arrancar el dashboard
npm run dev
#   → http://localhost:3000/prospect
```

Comandos útiles de BD: `npm run db:studio` (Drizzle Studio), `npm run db:down` (parar Postgres).

---

## API keys necesarias

Todas se configuran en `.env.local` (nunca en el código). Plantilla en `.env.example`.

### 1. Google — Places API (New) + PageSpeed Insights
1. Entra en [console.cloud.google.com](https://console.cloud.google.com) y crea un proyecto.
2. **APIs & Services → Enable APIs & Services** y habilita:
   - **Places API (New)** ← búsqueda de negocios (requiere **facturación activada**)
   - **PageSpeed Insights API** ← auditoría de velocidad/SEO (gratuita)
3. **Credentials → Create credentials → API key.**
4. Pega la key en `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY="tu-key"
   PAGESPEED_API_KEY="tu-key"   # puede ser la misma; si la dejas vacía se reutiliza la de arriba
   ```
> ⚠️ Places API exige facturación habilitada aunque exista capa gratuita. Sin
> facturación, las llamadas devuelven 403 y el scraping marcará la zona en `error`.

### 2. Claude (agentes de Fase 2) — dos modos
Los agentes de marketing pueden usar **tu suscripción Claude Pro/Max** (sin coste por token) o la
**API** (saldo prepago). Se elige con `AI_PROVIDER`:

```
# Por defecto: usa tu suscripción vía Claude Code headless (recomendado, $0 por token)
AI_PROVIDER="cli"
CLAUDE_CLI_MODEL="sonnet"        # alias de modelo para `claude -p`
# Requiere tener Claude Code instalado y haber hecho login con tu cuenta Pro (claude /login)

# Alternativa: API de Anthropic (necesita saldo en console.anthropic.com → Plans & Billing)
# AI_PROVIDER="api"
# ANTHROPIC_API_KEY="sk-ant-…"
# ANTHROPIC_MODEL="claude-sonnet-4-6"
```

> Con `cli` los agentes ejecutan `claude -p` por debajo usando tu login de suscripción (no la API).
> Es ideal para uso personal de bajo volumen. Aplica el límite de uso de tu plan Pro/Max; para lotes
> grandes, espácialos. Con `api` pagas por token (~$0.03–0.05 por lead, ver tabla de costos).

### Otras variables
- `DATABASE_URL` — por defecto apunta al contenedor local; no la cambies en dev.
- `DEFAULT_REFRESH_DAYS=90` — días antes de recomendar refrescar una zona.
- `PROSPECT_AUTH_TOKEN` — opcional, para proteger el panel (vacío = sin gate).

---

## Uso

### Scraping (por CLI o cron)
```bash
npm run scrape -- --country "Malta" --zone "St. Julian's" --category restaurants
npm run scrape -- --country "Malta" --zone "Sliema" --category hotels --force
```
- Antes de gastar cuota consulta la cobertura: si la zona se evaluó hace poco, **no llama
  a la API** y avisa. `--force` refresca igualmente (upsert por `place_id`, sin duplicar).
- Categorías disponibles: ver `src/server/config/categories.ts` (o usa texto libre).

### Auditoría (por CLI o cron)
```bash
npm run audit                  # audita todos los leads con web y sin auditar
npm run audit -- --limit 10    # como máximo 10
npm run audit -- --id 42       # uno concreto
npm run audit -- --staleDays 30   # re-audita los auditados hace > 30 días
```

### Pipeline de agentes IA (Fase 2)
```bash
npm run pipeline -- --id 3                   # un lead (Research → Audit/SEO → Copywriting)
npm run pipeline -- --minScore 40 --limit 5  # lote sobre leads de score alto
```
Genera, por lead: perfil de research, análisis competitivo + gaps SEO, mensaje de outreach
(email + WhatsApp) e ideas de contenido (guardadas como borradores en `social_posts`). Cada paso
queda registrado en `agent_tasks` (estado, tokens, coste). Por defecto usa tu suscripción (`cli`).

### Dashboard
`http://localhost:3000/prospect`
- **Leads:** tabla ordenada por score, filtros, chips de problemas; detalle con pestañas
  (Negocio · Auditoría técnica · Investigación · Mensajes · Historial · Notas), cambio de estado,
  notas, botón "Auditar" y "Ejecutar pipeline IA". Botón "+ Nueva búsqueda".
- **Cobertura:** progreso agregado por país ("Malta: X de 8"), ledger por zona×categoría, refresco.
- **Operaciones:** estado de los agentes en tiempo real (polling), botón de pipeline en lote, coste.

---

## Costos aproximados

| API | SKU | Costo aprox. | Notas |
|-----|-----|--------------|-------|
| Google Places (New) Text Search | por request | ~$0.032 | 1 zona×categoría ≈ 1–3 requests (hasta ~60 negocios) → **~$0.03–0.10 por zona** |
| PageSpeed Insights | — | **gratis** | 2 llamadas por negocio (móvil+desktop); se registra para conteo |
| Claude — agentes (`AI_PROVIDER=cli`) | suscripción | **$0 por token** | usa tu plan Pro/Max; aplica su límite de uso |
| Claude — agentes (`AI_PROVIDER=api`) | tokens | ~$0.03–0.05 / lead | pipeline completo (3 agentes) con Sonnet 4.6 |

El gasto se registra en `api_usage` y se ve en vivo en el dashboard. Con `cli` el coste en $ es 0
(cubierto por la suscripción); los tokens igual se registran.

---

## Autenticación y acceso remoto ($0)

El panel tiene **login** (usuario/contraseña + cookie de sesión firmada). Se activa al
configurar `AUTH_USERS` y `AUTH_SECRET` en `.env.local` (sin ellas, queda abierto en local).

```
AUTH_USERS="gio:claveGio,hermano:claveHermano"
AUTH_SECRET="<cadena larga aleatoria: openssl rand -base64 36>"
```

**Compartir con otra persona sin pagar hosting** (servidor en tu máquina + túnel):

```bash
npm run db:up        # 1. Postgres (Docker)
npm run build        # 2. compila (solo tras cambios de código)
npm run start        # 3. servidor en http://localhost:3000 (con login)
npm run tunnel       # 4. en otra terminal → imprime una URL pública https://...trycloudflare.com
```

Pasa esa URL + las credenciales a la otra persona. Como el servidor corre en **tu** equipo,
los **agentes IA** se ejecutan con **tu suscripción Claude** ($0) aunque los dispare la otra
persona desde la web. La plataforma está online solo mientras tu máquina + `start` + `tunnel`
estén encendidos.

> Requiere `cloudflared` (`brew install cloudflared`). La URL de `trycloudflare.com` **cambia
> cada vez**; para una URL fija y gratuita, configura un *named tunnel* de Cloudflare con un
> dominio propio.

## Estado del proyecto

Ver **`PROGRESS.md`** para el checklist detallado y qué está probado. Resumen:
- ✅ **Fase 1** completa y probada: control de zonas, scraping Places, auditoría automática, esquema, dashboard.
- ✅ **Fase 2** completa y probada: equipo de agentes (Research · Audit/SEO · Copywriting) + Orchestrator
  con trazabilidad (`agent_tasks`/`pipeline_runs`), base de redes sociales (`SocialPublisher` + drafts,
  sin OAuth) y Centro de operaciones en el dashboard. Por defecto corre sobre la suscripción Claude Pro.
