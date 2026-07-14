# Juko Prospect — PROGRESS

Herramienta interna de prospección B2B (scraping + auditoría + dashboard + agentes IA).
Construida dentro de `juko-web` (Next.js 16 · Drizzle · Postgres/Docker · TS).

**Regla de marcado:** una tarea se marca `[x]` solo si se **probó de forma real**
(ejecutada/verificada), no solo escrita. Si la prueba falla, queda `[ ]` con nota del error.

Leyenda: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho y probado · `[!]` bloqueado (falta key/credencial)

---

## Fundación / Setup (pre-requisito de todas las secciones)
- [x] Dependencias instaladas (drizzle-orm, pg, zod, cheerio, drizzle-kit, tsx)
- [x] `docker-compose.yml` con Postgres 16 (puerto host 5433) — contenedor `healthy`
- [x] `drizzle.config.ts` + loader de env sin dependencias (`load-env.ts`)
- [x] Config de entorno validada con zod (`server/config/env.ts`)
- [x] Cliente Drizzle con pool cacheado para hot-reload (`server/db/client.ts`)
- [x] Esquema completo Fase 1 + Fase 2 (13 tablas) generado y migrado
- [x] Smoke test de runtime (env → pool → drizzle → schema) pasa
- [x] `.env.example` y `.env.local` con vars de la herramienta
- [x] `package.json` scripts (db:up/down/generate/migrate/push/studio, scrape, audit, pipeline, seed:zones)
- [x] `/data` en `.gitignore`

**Resumen:** Stack unificado dentro de la app Next existente para iterar más rápido (un
solo lenguaje/deploy, tipos compartidos). Postgres por Docker → cero migración futura.
Esquema con status como `text` (no enums pg) para no requerir ALTER TYPE en Fase 2.
Probado: `drizzle-kit migrate` crea las 13 tablas; un script tsx consulta zones/businesses/coverage OK.

---

## Fase 1

### 0. Sistema de control de zonas geográficas
- [x] Tabla `zones` (catálogo país/región/zona, `planned` para progreso agregado)
- [x] Tabla `coverage` (zonas_evaluadas) con status/last_run/results/next_refresh
- [x] Servicio: consulta previa por (zona, categoría) antes de scrapear (`evaluateCoverage`)
- [x] Lógica: zona inexistente → ejecuta y crea registro (action=run)
- [x] Lógica: completada reciente → avisa (fecha + N negocios), no gasta cuota (action=skip_recent)
- [x] Lógica: antigua (> refresh_interval_days) → ofrece refrescar (action=offer_refresh)
- [x] Marcado de estado en progreso/completada/parcial/error (`markCoverageInProgress`/`recordCoverageResult`)
- [x] Progreso agregado por país ("Malta: 5 de 8 zonas") (`getCountryProgress`)
- [x] Script `seed:zones` para precargar zonas de Malta (planned) — 8 zonas creadas
- [x] Pruebas reales del servicio de cobertura (sin gastar cuota Places) — 16/17 checks

> **Resumen sección 0:** Construido `services/coverage/service.ts` con `evaluateCoverage`
> (decide run / skip_recent / offer_refresh / in_progress según el ledger), `ensureZone`
> idempotente, `markCoverageInProgress`, `recordCoverageResult` (calcula next_refresh = hoy +
> refresh_days y acumula api_calls en refrescos), `listCoverage` (con flag `needsRefresh`) y
> `getCountryProgress` (covered/planned por país). Probado vía script tsx el ciclo completo
> nuevo→en_progreso→completada→reciente(skip)→forzado→antigua(offer_refresh)→refresco, más
> idempotencia de zonas y progreso agregado. Decisión: el upsert por `place_id` (anti-duplicado
> de negocios) se implementa en la sección 1 (scraping), aquí solo el control de zonas.

### 1. Módulo de scraping
- [x] Cliente Google Places **API (New)** `places:searchText` con field mask (`places/client.ts`)
- [x] Input país + zona + categoría (nunca país solo) — `scrapeZoneCategory`
- [x] Consulta `coverage` antes de ejecutar (integra sección 0) — probado: skip sin gastar cuota
- [x] Guardado con dedup global por `place_id` (upsert, no duplica) — probado con zona solapada
- [x] Manejo de paginación (`nextPageToken`, maxPages) y rate limiter cliente
- [x] Manejo de errores: cuota excedida (429), timeout, 403 key inválida, respuesta vacía
- [x] Actualiza `coverage` al finalizar (completada/parcial/error, fecha, conteo, api_calls)
- [x] Ejecutable por CLI / cron (`npm run scrape -- --country ... --zone ... --category ...`)
- [x] Log de uso/costo de Places en `api_usage` (`usage/tracker.ts`)
- [x] Prueba real contra la API en vivo — 60 negocios reales de St. Julian's en 3 llamadas

> **Decisión:** uso Places API (New) en vez de la legacy: una sola llamada devuelve
> teléfono/web/rating vía field mask, evitando un Place Details por negocio → menos
> requests y menos costo. Dedup global por `place_id` con upsert (detección insert/update
> vía `xmax`), así una zona solapada actualiza en vez de duplicar. Probado sin gastar cuota:
> 12/12 checks. **Prueba en vivo:** `scrape Malta/St. Julian's/restaurants` → 60 negocios
> (56 con web), coverage=completada, ~$0.096. 2ª corrida → skip_recent con 0 llamadas. `--force`
> → 0 nuevos / 60 actualizados, 60 place_ids distintos (cero duplicados), api_calls 3→6 acumulado.

### 2. Módulo de auditoría automática
- [x] PageSpeed Insights (móvil + desktop): performance/SEO/accesibilidad/best-practices (`audit/pagespeed.ts`)
- [x] Verificación HTTPS (URL final post-redirect + status < 400)
- [x] Detección de widget de chat/WhatsApp en el HTML (`audit/detectors.ts`, 10 vendors)
- [x] Detección de e-commerce (Shopify/WooCommerce/Magento/Presta/… + carrito genérico)
- [x] Cálculo de "score de oportunidad" 0-100 (`audit/score.ts`, función pura)
- [x] Guardado en `audits` + denormalización (`opportunity_score`/`audit_status`/`last_audited_at`) en `businesses`
- [x] Manejo de errores (sitio caído → site_unreachable; PSI por estrategia → parcial; timeouts)
- [x] Ejecutable por CLI (`npm run audit [-- --id N | --limit N | --staleDays N]`)
- [x] Log de uso PSI en `api_usage`
- [x] Prueba real con PAGESPEED_API_KEY — auditados negocios reales de Malta
- [x] Fix detección: `mage/` hacía falso positivo con "image/" → patrón magento específico

> **Resumen sección 2:** PSI corre 1 llamada por estrategia (móvil/desktop), cada una
> independiente (si una falla → auditoría `partial`, no aborta). Detectores por regex sobre
> HTML+headers con User-Agent de navegador. Score 0-100 = suma ponderada de problemas
> (perf móvil/desktop, SEO, accesibilidad, no-HTTPS, no-chat, no-ecommerce esperado, pocas
> reviews), cada uno con código de issue para el dashboard. Probado: score 8/8 (pura),
> detectores 7/7 (regresión de falsos positivos), 2 auditorías reales en vivo OK con scores,
> HTTPS, chat y ecommerce correctos; corregido falso positivo magento y re-verificado en vivo.

### 3. Esquema de base de datos
- [x] Tablas negocios/auditorías/notas/pipeline diseñadas y migradas
- [x] Estados de pipeline (lead_status) preparados para Fase 2
- [x] Campos de notas manuales
- [x] Relaciones e índices definidos
> Nota: el esquema cubre Fase 1 y Fase 2; ya migrado en Fundación.

### 4. Dashboard
- [x] Editar `proxy.ts` para excluir `/prospect` del redirect de locale
- [x] Vista "Cobertura/Zonas" con agregado por país (barras "1 de 8") y estado de refresco
- [x] Lanzar nueva zona / refrescar desde la UI (respeta lógica sección 0: avisa antes de gastar)
- [x] Tabla de leads: nombre, categoría, zona, score, problemas (chips), estado
- [x] Filtros: país, categoría, score mínimo, estado (con facets de la BD)
- [x] Orden por score de oportunidad (desc, nulls last)
- [x] Vista detalle de lead con tabs: Negocio | Auditoría técnica | Notas; cambiar estado; re-auditar
- [x] Botón lanzar scraping desde UI con aviso `skip_recent` si zona ya evaluada
- [x] API routes (`/api/prospect/*`): coverage, coverage/check, scrape, leads, leads/[id] (GET+PATCH), notes, audit, categories, usage
- [x] Indicador de uso/costo en vivo (UsageBadge, polling 30s)
- [x] Prueba real vía HTTP (sin navegador en este entorno): build OK, 200 en todas las páginas, endpoints devuelven datos reales, validación 400/404, mutaciones persisten, sitio marketing intacto

> **Resumen sección 4:** Dashboard interno como **root layout separado** (`/prospect`, no
> localizado) — patrón de múltiples root layouts de Next 16; `proxy.ts` excluye `/prospect`.
> Páginas client que consumen los Route Handlers `/api/prospect/*`. Cobertura agrupada por país
> con progreso agregado y refresco que respeta la sección 0 (check previo sin gastar cuota →
> confirma antes de forzar). Leads ordenados por score con chips de problemas (subconsulta del
> último audit). Detalle con tabs, cambio de estado de pipeline, re-auditoría y notas. Probado:
> `next build` OK (marketing + tool conviven), todos los GET devuelven datos reales (60 leads,
> filtros, skip_recent, usage $0.192), PATCH/POST persisten, validaciones 400/404, `/es` intacto.

---

## Fase 2 (tras validar Fase 1)

### Agentes
- [x] `BaseAgent` (rol + system prompt propio) + capa de proveedor IA con logging de uso
- [x] **Proveedor IA intercambiable**: `cli` (Claude Code headless con la suscripción Pro, $0) | `api` (Anthropic API)
- [x] Research Agent (enriquece perfil del lead) — **probado en vivo vía suscripción**, $0, salida grounded
- [x] Audit/SEO Agent (competidores + gaps de contenido/SEO) — **probado en vivo**, comparativa grounded
- [x] Copywriting Agent (mensaje outreach email+WhatsApp + 3 ideas de contenido) — **probado en vivo**
- [x] Orchestrator (secuencia Research→Audit→Copywriting, registra en `agent_tasks` + `pipeline_runs`)
- [x] Cada agente probado de forma aislada antes de integrar (Research, Audit/SEO, Copywriting)
- [x] Pipeline completo probado en vivo (lead Lumi): 3 tareas completadas, outputs persistidos, $0

> **Resumen agentes:** 3 agentes independientes (módulo + system prompt + esquema zod) + Orchestrator
> que corre la secuencia, registra cada paso en `agent_tasks` (pending→en_progreso→completada/error con
> tokens, coste, resultado), reúne competidores de la BD, opcionalmente extrae texto de la web para
> Research, y persiste en research_profiles/competitor_analyses/outreach_messages. Probado en vivo vía
> suscripción: pipeline completo de Lumi → research✅ audit_seo✅ copywriting✅, 2 mensajes (email+WhatsApp)
> en borrador, todo $0. CLI `npm run pipeline -- --id N | --minScore M --limit N`.

> **Decisión clave (a petición del usuario):** como es una herramienta personal de bajo volumen,
> los agentes usan por defecto el **proveedor `cli`** = Claude Code headless (`claude -p`) con la
> **suscripción Claude Pro/Max** (sin saldo de API). Capa `services/ai/providers/` con dos backends
> (`cli`/`api`) seleccionables por `AI_PROVIDER`. El `cli` reemplaza el system prompt por defecto de
> Claude Code (`--system-prompt` + `--exclude-dynamic-system-prompt-sections`) para minimizar tokens,
> fuerza JSON con plantilla derivada del esquema zod, y quita `ANTHROPIC_API_KEY` del subproceso para
> autenticar con la suscripción. Modelo `sonnet`. Probado en vivo: Research Agent sobre Lumi Malta →
> análisis correcto y grounded en 23.9s, coste $0. El backend `api` queda listo por si se prefiere saldo.

### Conexión con redes sociales (base, sin OAuth)
- [x] Tablas `social_accounts` / `social_posts` (migradas)
- [x] Interfaz abstracta `SocialPublisher` (punto de extensión) + `DraftPublisher`
- [x] Copywriting Agent guarda ideas de contenido como `social_posts` borrador — probado (3 drafts)

### Dashboard — Centro de operaciones
- [x] Vista en tiempo real (polling 4s) de qué agente trabaja en qué lead (`/prospect/operations`)
- [x] Sub-vista por lead con tabs (Negocio | Auditoría | Investigación | Mensajes | Historial | Notas)
- [x] Botón "Ejecutar pipeline IA" individual + en lote (score alto, orquestado desde el cliente)
- [x] Indicador de costo/uso de Claude (UsageBadge; $0 con proveedor `cli`, tokens registrados)

> **Resumen Centro de operaciones:** vista de operaciones con polling que muestra cada `pipeline_run`
> y el estado de sus 3 agentes en vivo; detalle de lead ampliado con pestañas Investigación
> (research + competidores), Mensajes (email/WhatsApp + ideas) e Historial (tareas con tokens/coste);
> botón de pipeline por lead y lote (el cliente recorre los leads de score alto llamando al endpoint
> por lead, así ninguna request HTTP dura minutos). Probado en vivo vía servidor: pipelines completos
> de varios leads, drafts sociales guardados, feed de operaciones y usage correctos.
>
> **Incidencia resuelta:** al correr 3 `claude -p` seguidos dentro del servidor `next start` aparecían
> fallos transitorios (`Command failed`) por contención de subprocesos. Solución: cerrar stdin del hijo
> (`child.stdin.end()`), 1 reintento por llamada, y 800ms de separación entre agentes en el Orchestrator.
> Tras el fix, varios pipelines vía HTTP completaron sin fallos. (Vía `npm run pipeline` nunca falló.)

---

## Mejoras de UI/UX
- [x] **Rediseño del detalle del lead** (skill ui-ux-pro-max): anillo de score de oportunidad,
  barras de PageSpeed móvil/desktop, flags HTTPS/chat/ecommerce con iconos SVG, chips de problemas,
  **tira del equipo de agentes en vivo** (3 tarjetas con estado/tokens/tiempo que se actualizan por
  polling mientras corre el pipeline), botón prominente "Ejecutar pipeline IA", y pestañas
  Investigación/Mensajes (con botón Copiar)/Historial. Componentes en `_components/viz.tsx`
  (ScoreRing, Meter, FlagPill, AgentCard, iconos SVG). Tema oscuro, números tabulares, sin emojis-icono.

## Notas / incidencias
_(se registran aquí los errores encontrados durante pruebas y su corrección)_

- **2026-06-23 · Fase 2 · saldo Anthropic:** el primer test en vivo del Research Agent falló con
  `400 invalid_request_error: Your credit balance is too low`. La key es válida (autenticó) y la
  request bien formada. Acción pendiente del usuario: añadir crédito en console.anthropic.com →
  Plans & Billing. Mientras tanto, los tests en vivo de los agentes quedan sin marcar.
- **Fix `zodOutputFormat`:** en `@anthropic-ai/sdk` 0.105 toma 1 argumento (solo el esquema), no 2.
