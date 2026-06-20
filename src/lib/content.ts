import type { Locale } from "./i18n";

/* ----------------------------------------------------------------
   Localized helper type
   ---------------------------------------------------------------- */
type L = Record<Locale, string>;
type LArr = Record<Locale, string[]>;

export const SOCIAL = {
  email: "jukopila.giovanny15@gmail.com",
  whatsapp: "https://wa.me/35679529100",
  linkedin: "https://www.linkedin.com/in/giovanny-zdenco-jukopila-rueda-a86704210/",
  github: "https://github.com/GiovannyJukopila",
  location: "Malta",
};

/* ----------------------------------------------------------------
   SERVICES
   ---------------------------------------------------------------- */
export type ServiceIcon = "ai" | "web" | "mobile" | "cloud" | "integration" | "design";

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
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

/* ----------------------------------------------------------------
   PROJECTS (real, shipped, delivered across several countries)
   ---------------------------------------------------------------- */
export type Category = "SaaS" | "Web" | "Mobile";

export interface Store {
  type: "iOS" | "Android";
  url: string;
}

export interface Project {
  slug: string;
  title: string;
  cat: Category;
  filters: Category[];
  featured?: boolean;
  img: string;
  desc: L;
  overview: L;
  role: LArr;
  tech: string[];
  link?: string;
  stores?: Store[];
}

export const PROJECTS: Project[] = [
  {
    slug: "neo-one",
    title: "NEO ONE · Loyalty Platform",
    cat: "SaaS",
    filters: ["SaaS", "Mobile"],
    featured: true,
    img: "/projects/neoone.jpg",
    desc: {
      es: "SaaS de fidelización todo-en-uno para retail y hostelería. Plataforma web multi-tenant más apps móviles nativas con puntos, recompensas y analítica.",
      en: "All-in-one loyalty SaaS for retail & hospitality. Multi-tenant web platform plus native mobile apps with points, rewards and analytics.",
    },
    overview: {
      es: "NEO ONE es una plataforma de fidelización completa para comercios y hostelería. Combina un panel web multi-tenant para los negocios con apps móviles nativas para los clientes finales, gestionando puntos, recompensas, campañas y analítica en tiempo real.",
      en: "NEO ONE is a complete loyalty platform for retail and hospitality. It pairs a multi-tenant web dashboard for businesses with native mobile apps for end customers, handling points, rewards, campaigns and real-time analytics.",
    },
    role: {
      es: ["Plataforma web multi-tenant en Angular", "Apps móviles nativas con Flutter (iOS y Android)", "Backend y APIs con Node.js", "Infraestructura en AWS y Firebase", "Sistema de puntos, recompensas y analítica"],
      en: ["Multi-tenant web platform in Angular", "Native mobile apps with Flutter (iOS & Android)", "Backend and APIs with Node.js", "AWS and Firebase infrastructure", "Points, rewards and analytics system"],
    },
    tech: ["Angular", "Flutter", "Firebase", "Node.js", "AWS"],
    link: "https://neo-one.eu/",
    stores: [
      { type: "iOS", url: "https://apps.apple.com/app/neo-one/id6762820197" },
      { type: "Android", url: "https://play.google.com/store/apps/details?id=com.neoone.app" },
    ],
  },
  {
    slug: "neoapp-sports",
    title: "NeoApp · Sports Manager",
    cat: "SaaS",
    filters: ["SaaS", "Mobile"],
    img: "/projects/neoappgym.jpg",
    desc: {
      es: "Plataforma de gestión de gimnasios y deporte: socios, reservas, planes y control de acceso en tiempo real, en web y móvil.",
      en: "Gym & sports management platform: members, scheduling, plans and real-time access control across web and mobile.",
    },
    overview: {
      es: "Plataforma para la gestión integral de gimnasios y centros deportivos. Permite administrar socios, reservas, planes de membresía y control de acceso en tiempo real, sincronizado entre la web de administración y la app móvil.",
      en: "A platform for the end-to-end management of gyms and sports centers. It handles members, bookings, membership plans and real-time access control, synced between the admin web and the mobile app.",
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
    cat: "Web",
    filters: ["Web"],
    img: "/projects/neoapp.jpg",
    desc: {
      es: "Landing corporativa para una empresa de software empresarial. Aplicaciones escalables, UI premium y un diseño enfocado a la generación de leads.",
      en: "Corporate landing for an enterprise software company. Scalable apps, premium UI and a lead-generation focused design.",
    },
    overview: {
      es: "Sitio corporativo para una empresa de software empresarial. El objetivo era comunicar credibilidad y capacidades técnicas con una UI premium, optimizada para la captación de leads y el posicionamiento de marca.",
      en: "Corporate site for an enterprise software company. The goal was to communicate credibility and technical capabilities with a premium UI, optimized for lead generation and brand positioning.",
    },
    role: {
      es: ["Diseño y desarrollo web en Angular", "UI premium y responsive", "Estructura enfocada a generación de leads", "Despliegue en AWS"],
      en: ["Web design and development in Angular", "Premium, responsive UI", "Lead-generation focused structure", "Deployment on AWS"],
    },
    tech: ["Angular", "SCSS", "AWS"],
    link: "https://neo-app.eu/",
  },
  {
    slug: "osteosur",
    title: "Osteosur Colombia",
    cat: "Web",
    filters: ["Web"],
    img: "/projects/osteosur.jpg",
    desc: {
      es: "Sitio corporativo y catálogo de producto para un distribuidor de dispositivos médicos (osteosíntesis y material quirúrgico) con un diseño limpio y de confianza.",
      en: "Corporate site & product catalog for a medical-device distributor (osteosynthesis & surgical materials) with a clean, trust-driven design.",
    },
    overview: {
      es: "Sitio corporativo y catálogo para un distribuidor de dispositivos médicos especializado en osteosíntesis y material quirúrgico. El diseño prioriza la confianza, la claridad y una navegación sencilla por el catálogo de producto.",
      en: "Corporate site and catalog for a medical-device distributor specialized in osteosynthesis and surgical materials. The design prioritizes trust, clarity and easy navigation through the product catalog.",
    },
    role: {
      es: ["Diseño web limpio y de confianza", "Catálogo de producto", "Desarrollo en Angular", "Despliegue en Netlify"],
      en: ["Clean, trust-driven web design", "Product catalog", "Development in Angular", "Deployment on Netlify"],
    },
    tech: ["Angular", "SCSS", "Netlify"],
    link: "https://osteosur.netlify.app/",
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
