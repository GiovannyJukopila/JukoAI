/**
 * Feature flags — central kill-switches for costly or deprecated surfaces.
 *
 * Plain constants (no env access, no server-only imports) so both client
 * components and server code can import them.
 */

/**
 * Master switch for the business evaluation/audit machinery:
 * Google Places scraping ("Evaluar") and PageSpeed audits ("Auditar").
 *
 * While `false`:
 *  - the UI hides every Evaluar/Auditar action,
 *  - the API routes that spend Google quota return 403,
 *  - the Places/PageSpeed clients refuse to run (defense in depth,
 *    also covers the CLI scripts `npm run scrape|audit|pipeline`).
 */
export const ENABLE_BUSINESS_AUDIT: boolean = false;

/**
 * Deprecated sections (Fase 2 del plan de refactor). Hidden from the sidebar
 * and their routes redirect to /prospect/leads while off. Code kept intact.
 * "Operaciones" → batch AI pipeline view; "Content Intel" → CIC trends UI
 * (replaced by Social Studio + Radar IA in later phases).
 */
export const ENABLE_OPERATIONS: boolean = false;
export const ENABLE_CONTENT_INTEL: boolean = false;

/**
 * Usuarios que pueden disparar el Refresh del Radar IA. El refresh ejecuta
 * `claude -p` con la suscripción Pro del dueño y solo funciona en la máquina
 * donde el CLI está logueado — el resto de usuarios ve el último escaneo
 * cacheado (el botón se oculta y el endpoint devuelve 403).
 * "dev" = fallback cuando el login está desactivado en local.
 */
export const RADAR_REFRESH_USERS: readonly string[] = ["giovannyjukopila", "dev"];

/**
 * Active markets. Countries not on this list disappear from every dropdown,
 * navigator and listing — the rows stay untouched in the database, they are
 * only filtered out server-side. Values must match the `country` text stored
 * in `cities` / `zones` / `businesses` (Spanish names, e.g. "Colombia").
 */
export const ENABLED_COUNTRIES: readonly string[] = ["Colombia", "Malta"];
