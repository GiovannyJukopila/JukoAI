import type { Locale } from "./i18n";

/* ----------------------------------------------------------------
   Localized helper type
   ---------------------------------------------------------------- */
type L = Record<Locale, string>;
type LArr = Record<Locale, string[]>;

/**
 * WhatsApp by region: Latin America, and everyone else (lib/region.ts picks one per visitor).
 * `url` opens the chat with a first message already typed, in Spanish for the Latin American
 * number and in English for the international one; `base` is the plain chat link.
 */
const waLink = (number: string, text: string) => ({ base: `https://wa.me/${number}`, url: `https://wa.me/${number}?text=${encodeURIComponent(text)}` });
export const WHATSAPP = {
  latam: { ...waLink("573005120188", "Hola Juko AI 👋 Vengo de su web y me gustaría cotizar un proyecto."), label: "+57 300 512 0188" },
  intl: { ...waLink("35679529100", "Hi Juko AI 👋 I found you through your website and I'd like a quote for a project."), label: "+356 7952 9100" },
};

export const SOCIAL = {
  email: "jukopila.giovanny15@gmail.com",
  // default WhatsApp where the region can't be known (no browser): the international number
  whatsapp: WHATSAPP.intl.base,
  linkedin: "https://www.linkedin.com/in/giovanny-zdenco-jukopila-rueda-a86704210/",
  github: "https://github.com/GiovannyJukopila",
  location: "Malta",
};

/* ----------------------------------------------------------------
   SERVICES
   ---------------------------------------------------------------- */
export type ServiceIcon = "ai" | "web" | "mobile" | "cloud" | "integration" | "design" | "search";

export interface Service {
  slug: string;
  icon: ServiceIcon;
  size?: "lg" | "wide";
  title: L;
  short: L;
  lead: L;
  includes: LArr;
  highlights: LArr;
  stack: string[];
}

export const SERVICES: Service[] = [
  {
    slug: "automatizacion-ia",
    icon: "ai",
    size: "lg",
    title: { es: "Automatización & Agentes con IA", en: "AI Automation & Agents" },
    short: {
      es: "Implementamos flujos con IA, agentes autónomos e integraciones con LLMs que eliminan trabajo manual y aceleran tus operaciones.",
      en: "We implement AI workflows, autonomous agents and LLM integrations that remove manual work and speed up your operations.",
    },
    lead: {
      es: "Conectamos modelos de lenguaje con tus procesos reales para que el trabajo repetitivo se haga solo, con control, trazabilidad y resultados medibles.",
      en: "We connect language models to your real processes so repetitive work runs on its own, with control, traceability and measurable results.",
    },
    includes: {
      es: ["Agentes y asistentes con IA a medida", "Automatización de procesos (RPA + LLM)", "RAG sobre tus documentos y datos", "Integración con APIs, CRMs y herramientas internas", "Pipelines y orquestación de tareas"],
      en: ["Custom AI agents and assistants", "Process automation (RPA + LLM)", "RAG over your documents and data", "Integration with APIs, CRMs and internal tools", "Task pipelines and orchestration"],
    },
    highlights: {
      es: ["Menos trabajo manual", "Respuestas y decisiones más rápidas", "Procesos que escalan sin sumar headcount"],
      en: ["Less manual work", "Faster answers and decisions", "Processes that scale without more headcount"],
    },
    stack: ["LLMs", "RAG", "n8n / Make", "Python", "APIs", "Webhooks"],
  },
  {
    slug: "desarrollo-web",
    icon: "web",
    title: { es: "Desarrollo Web", en: "Web Development" },
    short: { es: "Plataformas SaaS, dashboards y sitios corporativos rápidos, accesibles y a medida.", en: "Fast, accessible and bespoke SaaS platforms, dashboards and corporate sites." },
    lead: {
      es: "Construimos productos web escalables, desde el frontend hasta la base de datos, pensados para rendimiento, SEO y crecimiento.",
      en: "We build scalable web products, from the frontend to the database, designed for performance, SEO and growth.",
    },
    includes: {
      es: ["Plataformas SaaS multi-tenant", "Dashboards y paneles de administración", "Sitios corporativos y landing pages premium", "APIs y backend a medida", "SEO técnico y rendimiento"],
      en: ["Multi-tenant SaaS platforms", "Dashboards and admin panels", "Premium corporate sites and landing pages", "Custom APIs and backend", "Technical SEO and performance"],
    },
    highlights: { es: ["Carga rápida y accesible", "Diseño que convierte", "Código mantenible y escalable"], en: ["Fast and accessible", "Design that converts", "Maintainable, scalable code"] },
    stack: ["Angular", "React", "Next.js", "Node.js", ".NET", "PostgreSQL"],
  },
  {
    slug: "apps-moviles",
    icon: "mobile",
    title: { es: "Apps Móviles", en: "Mobile Apps" },
    short: { es: "Apps nativas multiplataforma con Flutter, publicadas en App Store y Google Play.", en: "Cross-platform native apps with Flutter, published on the App Store and Google Play." },
    lead: {
      es: "Diseñamos y publicamos apps móviles con experiencia nativa para iOS y Android desde una sola base de código.",
      en: "We design and publish mobile apps with a native experience for iOS and Android from a single codebase.",
    },
    includes: {
      es: ["Apps iOS y Android con Flutter", "Publicación en App Store y Google Play", "Notificaciones push y tiempo real", "Integración con backend y pagos", "Mantenimiento y nuevas versiones"],
      en: ["iOS and Android apps with Flutter", "App Store and Google Play publishing", "Push notifications and real-time", "Backend and payments integration", "Maintenance and new releases"],
    },
    highlights: { es: ["Una base de código, dos plataformas", "Experiencia fluida y nativa", "Time-to-market reducido"], en: ["One codebase, two platforms", "Smooth, native experience", "Reduced time-to-market"] },
    stack: ["Flutter", "FlutterFlow", "Firebase", "Firestore"],
  },
  {
    slug: "cloud-devops",
    icon: "cloud",
    title: { es: "Cloud & DevOps", en: "Cloud & DevOps" },
    short: { es: "Infraestructura escalable, CI/CD y despliegues seguros en AWS y Firebase.", en: "Scalable infrastructure, CI/CD and secure deployments on AWS and Firebase." },
    lead: {
      es: "Preparamos tu producto para escalar: infraestructura como código, despliegues automáticos y monitoreo.",
      en: "We get your product ready to scale: infrastructure as code, automated deployments and monitoring.",
    },
    includes: {
      es: ["Infraestructura en AWS y Firebase", "Pipelines de CI/CD", "Despliegues seguros y rollbacks", "Monitoreo y alertas", "Optimización de costes"],
      en: ["AWS and Firebase infrastructure", "CI/CD pipelines", "Secure deployments and rollbacks", "Monitoring and alerts", "Cost optimization"],
    },
    highlights: { es: ["Despliegues sin fricción", "Alta disponibilidad", "Seguridad por defecto"], en: ["Frictionless deployments", "High availability", "Security by default"] },
    stack: ["AWS", "Firebase", "CI/CD", "Git", "Docker"],
  },
  {
    slug: "integraciones-apis",
    icon: "integration",
    title: { es: "Integraciones & APIs", en: "Integrations & APIs" },
    short: {
      es: "Conectamos tus sistemas, CRMs y herramientas con APIs robustas y automatizaciones a medida que hacen que todo trabaje en conjunto.",
      en: "We connect your systems, CRMs and tools with robust APIs and custom automations that make everything work together.",
    },
    lead: {
      es: "Hacemos que tus herramientas hablen entre sí: pasarelas de pago, CRMs, ERPs y servicios de terceros, integrados de forma fiable.",
      en: "We make your tools talk to each other: payment gateways, CRMs, ERPs and third-party services, integrated reliably.",
    },
    includes: {
      es: ["APIs REST y webhooks", "Integración de pagos (Stripe)", "Conexión con CRMs y ERPs", "Sincronización de datos", "Automatizaciones entre servicios"],
      en: ["REST APIs and webhooks", "Payments integration (Stripe)", "CRM and ERP connections", "Data synchronization", "Service-to-service automations"],
    },
    highlights: { es: ["Datos consistentes en todas tus apps", "Menos tareas manuales", "Integraciones fiables y monitorizadas"], en: ["Consistent data across your apps", "Fewer manual tasks", "Reliable, monitored integrations"] },
    stack: ["REST", "Webhooks", "Stripe", "CRM", "Node.js"],
  },
  {
    slug: "seo-aeo-geo",
    icon: "search",
    size: "wide",
    title: { es: "SEO, AEO y GEO", en: "SEO, AEO & GEO" },
    short: {
      es: "Estrategias de SEO, AEO y GEO para que tu marca aparezca dondequiera que tus clientes buscan respuestas: en Google, en asistentes de voz y en motores de IA como ChatGPT, Gemini o Perplexity.",
      en: "SEO, AEO and GEO strategies that help your brand get discovered wherever customers search for answers: on Google, in voice assistants and in AI engines like ChatGPT, Gemini or Perplexity.",
    },
    lead: {
      es: "Tus clientes ya no solo buscan en Google: también preguntan a asistentes y a la IA. Optimizamos tu web y tu contenido para que te encuentren en los buscadores (SEO), te elijan como respuesta directa (AEO) y te citen los motores generativos (GEO).",
      en: "Your clients no longer only search on Google: they also ask assistants and AI. We optimise your website and content so search engines find you (SEO), assistants pick you as the direct answer (AEO) and generative engines cite you (GEO).",
    },
    includes: {
      es: ["Auditoría técnica SEO y Core Web Vitals", "Datos estructurados (Schema.org) y resultados enriquecidos", "Contenido en formato pregunta-respuesta para AEO", "Optimización para motores de IA (GEO) y llms.txt", "SEO internacional y multilingüe (hreflang)", "Medición con Search Console y analítica"],
      en: ["Technical SEO audit and Core Web Vitals", "Structured data (Schema.org) and rich results", "Question-and-answer content for AEO", "AI engine optimisation (GEO) and llms.txt", "International, multilingual SEO (hreflang)", "Measurement with Search Console and analytics"],
    },
    highlights: {
      es: ["Más visibilidad en Google", "Apareces como respuesta en asistentes e IA", "Tráfico cualificado que convierte"],
      en: ["More visibility on Google", "You show up as the answer in assistants and AI", "Qualified traffic that converts"],
    },
    stack: ["Search Console", "Schema.org", "Core Web Vitals", "llms.txt", "GA4", "Next.js"],
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

/* ----------------------------------------------------------------
   PROJECTS (real, shipped, delivered across several countries)
   ---------------------------------------------------------------- */
export type Category = "SaaS" | "Web" | "Mobile";
export type Platform = "Web" | "iOS" | "Android";

export interface Store {
  type: "iOS" | "Android";
  url: string;
}

export interface Project {
  slug: string;
  title: string;
  tagline: L;
  cat: Category;
  filters: Category[];
  featured?: boolean;
  sector: L;
  location: L;
  platforms: Platform[];
  /** Brand colour that tints the mockup stage. */
  accent: string;
  desc: L;
  overview: L;
  highlights: LArr;
  role: LArr;
  tech: string[];
  link?: string;
  stores?: Store[];
}

const NEO_ONE_IOS = "https://apps.apple.com/mt/app/neo-one/id6762820197";
const NEO_ONE_ANDROID = "https://play.google.com/store/apps/details?id=com.neoone.app";
const SCANNER_ANDROID = "https://play.google.com/store/apps/details?id=com.neoone.scannerapp";
const DIGICLUB_IOS = "https://apps.apple.com/app/digiclub-by-digiprint/id6786220720";
const DIGICLUB_ANDROID = "https://play.google.com/store/apps/details?id=com.digiclub.app";

export const PROJECTS: Project[] = [
  {
    slug: "neo-one",
    title: "NEO ONE",
    tagline: { es: "Ecosistema de fidelización SaaS", en: "Loyalty SaaS ecosystem" },
    cat: "SaaS",
    filters: ["SaaS", "Mobile"],
    featured: true,
    sector: { es: "Retail y hostelería", en: "Retail & hospitality" },
    location: { es: "Europa", en: "Europe" },
    platforms: ["Web", "iOS", "Android"],
    accent: "#6d5efc",
    desc: {
      es: "Plataforma de fidelización para negocios físicos: panel web multi-tenant, app de miembro y app de escáner para iOS y Android, con IA que diseña las campañas.",
      en: "Loyalty platform for brick-and-mortar businesses: a multi-tenant web panel, a member app and a scanner app for iOS and Android, with AI that designs the campaigns.",
    },
    overview: {
      es: "NEO ONE es un ecosistema de fidelización listo para usar. El negocio elige su esquema (cashback, puntos y recompensas, o visitas con juegos), lo gestiona desde un panel web en 8 idiomas y sus clientes lo viven desde una app nativa. El personal registra compras y canjes con una app de escáner dedicada. AI Promo Studio genera el cartel promocional terminado a partir de una línea de texto, y el plan Branded publica la app con la marca del cliente en App Store y Google Play.",
      en: "NEO ONE is a ready-to-use loyalty ecosystem. The business picks its scheme (cashback, points & rewards, or visits with games), runs it from a web panel in 8 languages, and its customers live it through a native app. Staff log purchases and redemptions with a dedicated scanner app. AI Promo Studio turns one line of text into a finished promo poster, and the Branded plan ships the app under the client's own brand on the App Store and Google Play.",
    },
    highlights: {
      es: ["3 apps conectadas: panel, miembro y escáner", "3 esquemas: cashback, puntos y visitas con juegos", "AI Promo Studio: carteles generados con IA", "Apps white-label con la marca del cliente", "Pagos recurrentes y panel de dirección", "Web comercial en 11 idiomas"],
      en: ["3 connected apps: panel, member and scanner", "3 schemes: cashback, points and visits with games", "AI Promo Studio: AI-generated promo posters", "White-label apps under the client's brand", "Recurring payments and a CEO console", "Marketing site in 11 languages"],
    },
    role: {
      es: ["Panel de administración multi-tenant (React + Vite)", "App de miembro nativa con Flutter (iOS y Android)", "App de escáner para el personal con Flutter", "Backend serverless con Firebase y Cloud Functions", "AI Promo Studio: creatividades generadas con IA", "Pipeline white-label para apps con marca propia", "Web comercial en Angular SSR"],
      en: ["Multi-tenant admin panel (React + Vite)", "Native member app with Flutter (iOS & Android)", "Staff scanner app with Flutter", "Serverless backend on Firebase and Cloud Functions", "AI Promo Studio: AI-generated creatives", "White-label pipeline for branded apps", "Marketing site in Angular SSR"],
    },
    tech: ["Flutter", "React", "Angular SSR", "Firebase", "Cloud Functions", "Generative AI"],
    link: "https://neo-one.eu/",
    stores: [
      { type: "iOS", url: NEO_ONE_IOS },
      { type: "Android", url: NEO_ONE_ANDROID },
    ],
  },
  {
    slug: "coosalud",
    title: "Coosalud",
    tagline: { es: "Portal institucional cooperativo", en: "Cooperative institutional portal" },
    cat: "Web",
    filters: ["Web"],
    sector: { es: "Cooperativa", en: "Cooperative" },
    location: { es: "Colombia", en: "Colombia" },
    platforms: ["Web"],
    accent: "#22a06b",
    desc: {
      es: "Reconstrucción completa del portal de una cooperativa colombiana con más de 30 años: avisos oficiales con buscador, documentos descargables, eventos para asociados y pagos PSE.",
      en: "Full rebuild of the portal of a Colombian cooperative with 30+ years of history: searchable official notices, downloadable documents, member events and PSE payments.",
    },
    overview: {
      es: "Rediseñamos y reconstruimos desde cero el sitio de Coosalud, cooperativa multiactiva colombiana. El reto: transmitir confianza a sus asociados y publicar información oficial con rapidez. El resultado es un portal estático muy rápido con un centro de avisos y publicaciones filtrable, biblioteca de documentos con vista previa, agenda de eventos para asociados, acceso a pagos PSE y WhatsApp, y un fondo aurora en WebGL en la portada.",
      en: "We redesigned and rebuilt Coosalud's site from scratch for this Colombian multi-service cooperative. The challenge: build trust with its members and publish official information fast. The result is a very fast static portal with a filterable notices and publications hub, a document library with previews, a member events agenda, PSE payments and WhatsApp access, and a WebGL aurora backdrop on the home page.",
    },
    highlights: {
      es: ["Centro de avisos con buscador y filtros", "Documentos PDF con vista previa y descarga", "Eventos para asociados con cuenta atrás", "Pruebas E2E en 10 anchos de pantalla"],
      en: ["Notices hub with search and filters", "PDF documents with preview and download", "Member events with countdown", "E2E tests across 10 screen widths"],
    },
    role: {
      es: ["UX/UI y arquitectura de la información", "Desarrollo en Next.js, React y TypeScript", "Shader aurora en WebGL", "Accesibilidad, SEO técnico y rendimiento", "Contenedor Docker + Nginx en VPS", "Pruebas automatizadas con Playwright"],
      en: ["UX/UI and information architecture", "Development in Next.js, React and TypeScript", "WebGL aurora shader", "Accessibility, technical SEO and performance", "Docker + Nginx container on a VPS", "Automated testing with Playwright"],
    },
    tech: ["Next.js", "React", "TypeScript", "Tailwind", "WebGL", "Docker"],
    link: "https://coosalud.coop/",
  },
  {
    slug: "comeca",
    title: "COMECA",
    tagline: { es: "Web corporativa industrial", en: "Industrial corporate website" },
    cat: "Web",
    filters: ["Web"],
    sector: { es: "Ingeniería metalmecánica", en: "Metalworking engineering" },
    location: { es: "Colombia", en: "Colombia" },
    platforms: ["Web"],
    accent: "#2f6fd6",
    desc: {
      es: "Web corporativa para una empresa de ingeniería metalmecánica con más de 30 años: servicios, sectores, portafolio de proyectos filtrable y captación de cotizaciones.",
      en: "Corporate website for a metalworking engineering company with 30+ years: services, industries, a filterable project portfolio and quote capture.",
    },
    overview: {
      es: "COMECA diseña, fabrica e instala estructuras y equipos metálicos para construcción, minería, energía y manufactura. Creamos una web que traduce esa solidez en confianza: hero con fotografía real de planta, cifras clave, servicios con sus estándares (ASME, API, OSHA), sectores atendidos, un portafolio de proyectos filtrable por tipo y un flujo de cotización directo por formulario y WhatsApp.",
      en: "COMECA designs, fabricates and installs metal structures and equipment for construction, mining, energy and manufacturing. We built a site that turns that solidity into trust: a hero with real plant photography, key figures, services with their standards (ASME, API, OSHA), industries served, a project portfolio filterable by type and a direct quote flow via form and WhatsApp.",
    },
    highlights: {
      es: ["Portafolio de proyectos filtrable", "Cotizaciones por formulario y WhatsApp", "SSR para SEO y carga rápida", "Imágenes servidas desde Firebase Storage"],
      en: ["Filterable project portfolio", "Quotes via form and WhatsApp", "SSR for SEO and fast loads", "Images served from Firebase Storage"],
    },
    role: {
      es: ["Diseño UI/UX y copy orientado a conversión", "Desarrollo en Angular con SSR", "Portafolio dinámico con Firebase", "Formulario de contacto y cotización", "Despliegue en Netlify"],
      en: ["UI/UX design and conversion-focused copy", "Development in Angular with SSR", "Dynamic portfolio with Firebase", "Contact and quote form", "Deployment on Netlify"],
    },
    tech: ["Angular", "SSR", "Firebase", "SCSS", "Netlify"],
    link: "https://comecatesting.netlify.app/",
  },
  {
    slug: "noir",
    title: "NOIR Barber Co.",
    tagline: { es: "Experiencia web cinematográfica", en: "Cinematic web experience" },
    cat: "Web",
    filters: ["Web"],
    sector: { es: "Barbería premium", en: "Premium barbershop" },
    location: { es: "Plantilla propia", en: "In-house template" },
    platforms: ["Web"],
    accent: "#c9a46a",
    desc: {
      es: "Plantilla premium con scroll cinematográfico: partículas 3D en WebGL que se transforman, cámara tipo dron y tipografía editorial.",
      en: "Premium template with cinematic scroll: shape-shifting 3D WebGL particles, a drone-style camera and editorial typography.",
    },
    overview: {
      es: "NOIR es nuestra plantilla insignia de webs inmersivas. El scroll dirige una escena WebGL de miles de partículas que se transforman en herramientas de barbería, con cámara tipo dron, capítulos fijados, titulares que entran letra a letra y capas de acabado (grano, viñeta, vidrio). Está optimizada para móvil y respeta prefers-reduced-motion. Es la base que usamos para marcas que quieren un efecto wow sin sacrificar rendimiento.",
      en: "NOIR is our flagship immersive-web template. Scrolling drives a WebGL scene of thousands of particles that morph into barber tools, with a drone-style camera, pinned chapters, letter-by-letter headlines and finishing layers (grain, vignette, glass). It is tuned for mobile and respects prefers-reduced-motion. It is the base we use for brands that want a wow effect without giving up performance.",
    },
    highlights: {
      es: ["Partículas 3D que cambian de forma con el scroll", "Cámara tipo dron y capítulos fijados", "Menú de servicios con scroll horizontal", "Rendimiento cuidado en móvil"],
      en: ["3D particles that morph as you scroll", "Drone-style camera and pinned chapters", "Horizontal-scroll services menu", "Performance tuned for mobile"],
    },
    role: {
      es: ["Dirección de arte y diseño", "Escena WebGL con three.js", "Coreografía de scroll con GSAP ScrollTrigger y Lenis", "Sistema tipográfico editorial", "QA visual automatizado"],
      en: ["Art direction and design", "WebGL scene with three.js", "Scroll choreography with GSAP ScrollTrigger and Lenis", "Editorial type system", "Automated visual QA"],
    },
    tech: ["three.js", "WebGL", "GSAP", "Lenis", "Vite"],
    link: "https://noirbarbertemplate.netlify.app/",
  },
  {
    slug: "digiclub",
    title: "Digiclub by Digiprint",
    tagline: { es: "App white-label iOS y Android", en: "White-label iOS & Android app" },
    cat: "Mobile",
    filters: ["Mobile"],
    sector: { es: "Imprenta · Fidelización", en: "Print · Loyalty" },
    location: { es: "Europa", en: "Europe" },
    platforms: ["iOS", "Android"],
    accent: "#7c8ba3",
    desc: {
      es: "App de fidelización con la marca de Digiprint sobre la plataforma NEO ONE, publicada en App Store y Google Play: cashback, QR personal y promociones.",
      en: "Loyalty app under Digiprint's brand on the NEO ONE platform, live on the App Store and Google Play: cashback, personal QR and promotions.",
    },
    overview: {
      es: "Digiclub es la primera app con marca propia construida sobre NEO ONE. Desde un mismo código Flutter generamos la app del cliente con su identidad (nombre, icono, colores y notificaciones) y la publicamos como actualización de la app que sus miembros ya tenían, en iOS y Android. Los clientes consultan su cashback, muestran su QR en caja, reciben promociones y gestionan su perfil en modo claro u oscuro.",
      en: "Digiclub is the first branded app built on NEO ONE. From a single Flutter codebase we generate the client's app with its own identity (name, icon, colours and notifications) and ship it as an update of the app its members already had, on iOS and Android. Customers check their cashback, show their QR at the till, receive promotions and manage their profile in light or dark mode.",
    },
    highlights: {
      es: ["Publicada en App Store y Google Play", "Generada desde el pipeline white-label de NEO ONE", "Modo claro y oscuro", "Notificaciones push"],
      en: ["Live on the App Store and Google Play", "Generated from the NEO ONE white-label pipeline", "Light and dark mode", "Push notifications"],
    },
    role: {
      es: ["Identidad del cliente aplicada a la app (icono, colores, splash)", "Migración de FlutterFlow a Flutter nativo", "Builds firmados para iOS y Android", "Publicación en App Store y Google Play"],
      en: ["Client identity applied to the app (icon, colours, splash)", "Migration from FlutterFlow to native Flutter", "Signed builds for iOS and Android", "Publishing on the App Store and Google Play"],
    },
    tech: ["Flutter", "Firebase", "iOS", "Android"],
    stores: [
      { type: "iOS", url: DIGICLUB_IOS },
      { type: "Android", url: DIGICLUB_ANDROID },
    ],
  },
  {
    slug: "neoapp-sports",
    title: "NeoApp · Sports Manager",
    tagline: { es: "Gestión de gimnasios y deporte", en: "Gym & sports management" },
    cat: "SaaS",
    filters: ["SaaS"],
    sector: { es: "Fitness y deporte", en: "Fitness & sports" },
    location: { es: "Europa", en: "Europe" },
    platforms: ["Web"],
    accent: "#f26a1b",
    desc: {
      es: "Plataforma de gestión de gimnasios y deporte: socios, reservas, planes y control de acceso en tiempo real.",
      en: "Gym & sports management platform: members, scheduling, plans and real-time access control.",
    },
    overview: {
      es: "Plataforma para la gestión integral de gimnasios y centros deportivos. Permite administrar socios, reservas, planes de membresía y control de acceso en tiempo real, sincronizado entre la web de administración y la app móvil.",
      en: "A platform for the end-to-end management of gyms and sports centers. It handles members, bookings, membership plans and real-time access control, synced between the admin web and the mobile app.",
    },
    highlights: {
      es: ["Control de acceso en tiempo real", "Planes y membresías", "Reservas y socios en un solo panel"],
      en: ["Real-time access control", "Plans and memberships", "Bookings and members in one panel"],
    },
    role: {
      es: ["Panel de administración web en Angular", "App móvil con Flutter", "Base de datos en tiempo real con Firestore", "Gestión de socios, planes y reservas", "Control de acceso en tiempo real"],
      en: ["Admin web panel in Angular", "Mobile app with Flutter", "Real-time database with Firestore", "Member, plan and booking management", "Real-time access control"],
    },
    tech: ["Angular", "Flutter", "Firebase", "Firestore"],
    link: "https://neoappgym.com/",
  },
  {
    slug: "neo-app-international",
    title: "NEO APP International",
    tagline: { es: "Web corporativa de software", en: "Software corporate website" },
    cat: "Web",
    filters: ["Web"],
    sector: { es: "Software empresarial", en: "Enterprise software" },
    location: { es: "Chipre · UE", en: "Cyprus · EU" },
    platforms: ["Web"],
    accent: "#d4a72c",
    desc: {
      es: "Web corporativa para una empresa de software empresarial: UI premium, globo 3D y una estructura enfocada a la generación de leads.",
      en: "Corporate website for an enterprise software company: premium UI, a 3D globe and a lead-generation focused structure.",
    },
    overview: {
      es: "Sitio corporativo para una empresa de software empresarial. El objetivo era comunicar credibilidad y capacidades técnicas con una UI premium, optimizada para la captación de leads y el posicionamiento de marca, y presentar sus productos (Gym App y NEO ONE).",
      en: "Corporate site for an enterprise software company. The goal was to communicate credibility and technical capabilities with a premium UI, optimized for lead generation and brand positioning, and to present its products (Gym App and NEO ONE).",
    },
    highlights: {
      es: ["Hero con globo 3D animado", "Catálogo de productos", "Estructura orientada a leads"],
      en: ["Hero with an animated 3D globe", "Product catalog", "Lead-oriented structure"],
    },
    role: {
      es: ["Diseño y desarrollo web en Angular", "UI premium y responsive", "Estructura enfocada a generación de leads", "Despliegue en AWS"],
      en: ["Web design and development in Angular", "Premium, responsive UI", "Lead-generation focused structure", "Deployment on AWS"],
    },
    tech: ["Angular", "SCSS", "AWS"],
    link: "https://neo-app.eu/",
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

/** Host shown in the browser chrome of the mockups, taken from the live link. */
export function domainOf(project: Project): string | undefined {
  return project.link ? new URL(project.link).hostname.replace(/^www\./, "") : undefined;
}

/* ----------------------------------------------------------------
   MOBILE APPS published on the stores (shown as the "apps" band)
   ---------------------------------------------------------------- */
export interface MobileApp {
  name: string;
  project: string;
  /** Key of the coded phone screen in `components/work/visuals.tsx`. */
  phone: string;
  /** The app's real launcher icon. */
  icon: string;
  role: L;
  platforms: Platform[];
  stores: Store[];
}

export const MOBILE_APPS: MobileApp[] = [
  {
    name: "NEO ONE",
    project: "neo-one",
    phone: "points",
    icon: "/projects/neo-one/neo-one-logo.webp",
    role: { es: "App de miembro · cashback, puntos y juegos", en: "Member app · cashback, points and games" },
    platforms: ["iOS", "Android"],
    stores: [{ type: "iOS", url: NEO_ONE_IOS }, { type: "Android", url: NEO_ONE_ANDROID }],
  },
  {
    name: "NEO ONE Scanner",
    project: "neo-one",
    phone: "scanner",
    icon: "/projects/neo-one/scanner-logo.webp",
    role: { es: "App del personal · escanear, sumar y canjear", en: "Staff app · scan, credit and redeem" },
    platforms: ["iOS", "Android"],
    stores: [{ type: "Android", url: SCANNER_ANDROID }],
  },
  {
    name: "Digiclub by Digiprint",
    project: "digiclub",
    phone: "home",
    icon: "/projects/digiclub/logo.webp",
    role: { es: "App con marca propia · white-label", en: "Branded app · white-label" },
    platforms: ["iOS", "Android"],
    stores: [{ type: "iOS", url: DIGICLUB_IOS }, { type: "Android", url: DIGICLUB_ANDROID }],
  },
];
