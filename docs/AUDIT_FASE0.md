# AUDIT FASE 0 — Reconocimiento del proyecto

> Generado como parte del plan de refactorización (PLAN_REFACTOR.md).
> Fecha: 2026-07-14

## 1. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 16.2.9** (App Router). ⚠️ Versión con breaking changes — consultar `node_modules/next/dist/docs/` antes de escribir código nuevo (ver `AGENTS.md`). |
| UI | React 19.2.4 + Tailwind CSS v4 (tokens custom en `src/app/globals.css`, prefijo `pa-*` para el panel). `framer-motion` 12 ya instalado (aún sin usar en el panel). |
| State | Estado local React (`useState`/`useEffect` + fetch a API routes vía `apiGet/apiSend` en `src/app/prospect/_lib.ts`). Sin librería global. |
| BD / ORM | PostgreSQL (Docker, puerto 5433) + **Drizzle ORM**. Schema: `src/server/db/schema.ts` (721 líneas). Migraciones en `src/server/db/migrations/`. |
| Auth | Login propio con cookie firmada (`src/server/auth/session.ts`), usuarios en env `AUTH_USERS`. Gate en `src/proxy.ts` (equivalente a middleware en Next 16) para `/prospect` y `/api/prospect`. |
| IA | `runStructured()` en `src/server/services/ai/client.ts` → provider `cli` (default, **suscripción Claude Pro** vía `claude -p`) o `api` (Anthropic API). Config en `src/server/config/env.ts` (`AI_PROVIDER`). |
| i18n | Panel: `src/app/prospect/_i18n.tsx` (es/en, client-side). Sitio marketing: `src/app/[locale]/` (separado, no se toca). |

**Estructura de alto nivel:**

- `src/app/[locale]/` — sitio de marketing público (fuera de alcance).
- `src/app/prospect/` — el **panel interno** (objeto del refactor).
- `src/app/api/prospect/` — API routes del panel.
- `src/server/` — servicios, DB, auth, config (server-only).

## 2. Árbol de rutas del panel (`/prospect`)

| Ruta | Archivo | Contenido |
|------|---------|-----------|
| `/prospect` | `src/app/prospect/page.tsx` | Redirección/entrada |
| `/prospect/login` | `login/` | Login |
| `/prospect/leads` | `leads/page.tsx` | Tab **Leads**: stats, analytics, filtros país→ciudad→zona, tabla de negocios |
| `/prospect/leads/[id]` | `leads/[id]/page.tsx` | Detalle de lead: botones **Re-auditar** (L168) y **Pipeline agentes IA** (L179), notas, mensajes outreach |
| `/prospect/coverage` | `coverage/page.tsx` (590 líneas) | Tab **Cobertura**: matriz zona×categoría con botones **Evaluar** (scrape Places), **Auditar**, acciones masivas por zona y por ciudad |
| `/prospect/operations` | `operations/page.tsx` | Tab **Operaciones**: batch de pipeline de agentes IA sobre leads |
| `/prospect/intel` | `intel/page.tsx` + `intel/trends/`, `intel/opportunities/` | Tab **Content Intel** (Content Intelligence Center): radar de tendencias + colector + agentes |

Navegación: sidebar en `src/app/prospect/_components/AppChrome.tsx` — array `NAV` (L34–39) con `leads`, `coverage`, `operations`, `intel`. Incluye `SpendPanel` (gasto API en vivo, L147).

## 3. Puntos de UI que disparan "Evaluar" / "Auditar"

| Acción | Ubicación UI | Endpoint que golpea |
|--------|--------------|---------------------|
| **Evaluar** (scrape Google Places — 💸 el costo real) | `coverage/page.tsx` (botones por categoría, por zona "Evaluar pendientes", por ciudad "Evaluar todas las zonas"); `_components/ScrapeLauncher.tsx` | `POST /api/prospect/scrape` |
| **Auditar** (PageSpeed + análisis web) | `coverage/page.tsx` L185 `runAudit()`, L232 (por negocio), L493 (botón); `leads/[id]/page.tsx` L75/L168 (Re-auditar) | `POST /api/prospect/audit-batch`, `POST /api/prospect/leads/:id/audit` |
| Textos i18n de estos botones | `_i18n.tsx` (claves `bulkEval`, `bulkAudit`, `evalAll`, `auditAll`, `cityEvalAll`, `cityAuditAll`, `evaluar`, `audit`, `reAudit`…) | — |

Selector de países: dropdowns en `leads/page.tsx` (L127) y `coverage/page.tsx` (L105 `catalogCountries`), alimentados por `GET /api/prospect/zones` (catálogo completo de la tabla `zones`). El componente `Analytics.tsx` también desglosa por país.

## 4. Llamadas a Google APIs (server-side)

| Servicio | Archivo | Endpoint Google | Quién lo invoca |
|----------|---------|-----------------|-----------------|
| **Places Text Search** (💸 principal generador de costos) | `src/server/services/places/client.ts` L16 (`places.googleapis.com/v1/places:searchText`) | `search.ts::scrapeZoneCategory` ← `POST /api/prospect/scrape` y script `npm run scrape`/`pipeline` |
| **PageSpeed Insights** (cuota gratuita, igual es Google) | `src/server/services/audit/pagespeed.ts` L12 (`googleapis.com/pagespeedonline/v5`) | `audit/runner.ts` ← `POST /api/prospect/leads/:id/audit`, `audit/batch.ts` ← `POST /api/prospect/audit-batch`, script `npm run audit` |

Rutas API que hay que proteger con el feature flag (Fase 1):

- `POST /api/prospect/scrape` — gasta cuota Places. **Crítico.**
- `POST /api/prospect/audit-batch` — dispara PageSpeed.
- `POST /api/prospect/leads/[id]/audit` — dispara PageSpeed.

Rutas relacionadas pero **inofensivas** (solo leen BD, no gastan):
`GET /api/prospect/coverage/check` (preview sin cuota), `GET /api/prospect/audit-progress`, `GET /api/prospect/coverage`.

**No hay llamadas automáticas a Google**: sin cron, sin `revalidate`, sin efectos que disparen scrape/audit. Los `setInterval` existentes solo hacen polling de lectura (operations 4s, spend 30s, agentes del lead 3s). Los scripts CLI (`npm run scrape|audit|pipeline`) también llaman Google pero solo se ejecutan a mano desde terminal.

## 5. Agentes IA — confirmación de proveedor

- Entrada única: `runStructured()` (`src/server/services/ai/client.ts`). Despacha según `env.AI_PROVIDER`:
  - `cli` (**default**): `providers/cli.ts` ejecuta `claude -p` headless con la **suscripción Pro** (además borra `ANTHROPIC_API_KEY` del env del subproceso). Sin costo API.
  - `api`: `providers/api.ts` usa Anthropic API (requiere `ANTHROPIC_API_KEY`). Es opt-in explícito por env; **no hay fallback automático** de cli→api.
- Agentes: `research`, `audit_seo`, `copywriting` (pipeline de leads) + agentes intel (CIC). Ninguno llama Google; trabajan sobre datos ya guardados en la BD.
- ⚠️ Nota conocida: los schemas de salida de agentes CLI deben ser **planos** (zod sin object-arrays anidados) — limitación del provider CLI.

## 6. Países / geografía

- Tablas: `cities` (country, name) y `zones` (country desnormalizado, cityId, name, planned). Los países son **texto libre** ("Colombia", "Malta", …), no códigos ISO.
- El catálogo llega al UI por `GET /api/prospect/zones` y `GET /api/prospect/coverage`; los dropdowns derivan los países de ahí. **Filtrar países = filtrar en config/servidor, sin tocar data** (Fase 2.1).
- Seeds: `src/server/db/seeds/` + `npm run seed:zones`.

## 7. Estado de git

- Repo git en la raíz del proyecto. Los últimos commits solo cubren el **sitio de marketing**; todo el panel prospect (`src/app/prospect`, `src/app/api`, `src/server`, `docs`, etc.) estaba **sin commitear** al iniciar el refactor. Se crea un commit baseline antes de empezar para poder hacer commits atómicos por tarea.

## 8. Implicaciones para las fases siguientes

1. **Fase 1**: crear `src/server/config/features.ts` (server) + exposición al cliente. Gatear los 3 endpoints de la sección 4 y ocultar botones de la sección 3.
2. **Fase 2**: `ENABLED_COUNTRIES` debe mapear a nombres ("Colombia", "Malta") o normalizar a ISO en la capa de servicio. Fusión Leads+Cobertura: ambas páginas ya comparten `Analytics`, `_lib.ts` y el catálogo de zonas — buena base para la vista unificada.
3. **Fase 3–7**: no existe hoy ninguna tabla de notificaciones/tareas/goals — schema nuevo con Drizzle (patrón: text-enums + índices como el schema actual). Realtime: no hay websockets; polling ligero encaja con el patrón existente.
4. **Fase 4**: ya existen tablas `social_accounts` / `social_posts` (Phase 2 del schema original) y `src/server/services/social/` — revisar antes de crear nuevas.
5. El panel usa CSS tokens propios (`--peri`, `--violet`, `--ink*`) y clases `pa-*` — mantener ese design system.
