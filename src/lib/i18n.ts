export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const dictionaries = {
  es: {
    nav: { services: "Servicios", work: "Proyectos", process: "Proceso", about: "Estudio", cta: "Hablemos" },
    hero: {
      badge: "Los más rápidos en entregar productos de calidad",
      t1: "Automatiza", t2: "Crea & Escala", t3: "con IA",
      lead: "Automatizamos tus procesos, creamos apps y webs a medida e integramos IA en tu negocio. Más resultados, menos trabajo manual y un producto listo para crecer.",
      cta1: "Cuéntanos tu idea", cta2: "Ver proyectos", scroll: "Desplaza",
      s1: "años entregando", s2: "productos en vivo", s3: "apps publicadas", s4: "alcance global",
      app: {
        brand: "Juko AI", panel: "Panel", live: "En vivo",
        metric: "Automatizaciones activas", value: "1,248", growth: "+38% este mes",
        rows: [
          { name: "Agente IA · Soporte", tag: "Activo" },
          { name: "Flujo · Facturación", tag: "Auto" },
          { name: "App · Reservas", tag: "Online" },
        ],
        floatA: "Crecimiento", floatAValue: "+38%",
        floatB: "IA · Resumen generado",
      },
      dash: {
        title: "Panel de control", sub: "Resumen en vivo",
        kpis: [
          { l: "Ingresos", v: "€48.2k", d: "+24%" },
          { l: "Usuarios", v: "9,312", d: "+12%" },
          { l: "Conversión", v: "6.8%", d: "+3%" },
        ],
        chart: "Ingresos · 30 días", bars: "Actividad", ring: "Objetivo", ringValue: "72%",
      },
    },
    services: {
      eyebrow: "Qué hacemos", title: "Servicios de extremo a extremo",
      sub: "Un equipo, todo el ciclo: estrategia, diseño, ingeniería e IA en producción.",
      all: "Ver todos los servicios", more: "Saber más",
    },
    work: {
      eyebrow: "Trabajo seleccionado", title: "Productos reales, en producción",
      sub: "Plataformas SaaS, apps móviles y sitios corporativos para clientes de distintos países, varios de ellos en Europa.",
      all: "Todos", mobile: "Móvil", viewAll: "Ver todos los proyectos", caseStudy: "Ver caso", visit: "Ver sitio",
    },
    process: {
      eyebrow: "Cómo trabajamos", title: "De la idea al producto",
      sub: "Un proceso claro, rápido y potenciado por IA, sin sacrificar la calidad de ingeniería.",
      steps: [
        { t: "Descubrimiento", d: "Entendemos tu negocio, definimos alcance, métricas y arquitectura." },
        { t: "Diseño & Prototipo", d: "UX/UI premium y prototipos navegables antes de construir el producto final." },
        { t: "Ingeniería con IA", d: "Construimos con flujos asistidos por IA: más rápido, seguro y con calidad." },
        { t: "Lanzamiento & Soporte", d: "Desplegamos, medimos e iteramos contigo a largo plazo." },
      ],
    },
    about: {
      eyebrow: "El estudio", title: "Ingeniería de clase mundial",
      p1: "Juko AI es un estudio global de desarrollo de software e inteligencia artificial. Como equipo, diseñamos, construimos y mantenemos productos web y móviles escalables, de extremo a extremo, combinando fundamentos sólidos de ingeniería con flujos de trabajo asistidos por IA.",
      p2: "Somos agnósticos a la tecnología y aprendemos rápido: nos adaptamos a tu stack y entregamos con rapidez, seguridad y calidad. Trabajamos con clientes en distintos países, varios de ellos en Europa, con un compromiso total con un producto de alto nivel y escalable.",
      cta: "Trabaja con nosotros",
      kpis: [
        { v: "+5", l: "años de experiencia" },
        { v: "100%", l: "enfoque a medida" },
        { v: "Global", l: "clientes en varios países" },
        { v: "Web · Móvil · IA", l: "capacidades full-stack" },
      ],
    },
    contact: {
      eyebrow: "Hablemos", title: "¿Tienes un proyecto en mente?",
      sub: "Cuéntanos qué quieres construir. Respondemos rápido!", wa: "WhatsApp",
      form: {
        name: "Nombre", email: "Correo", company: "Empresa", companyOpt: "(opcional)",
        message: "Mensaje", namePh: "Tu nombre", emailPh: "tu@correo.com",
        companyPh: "Nombre de tu empresa", messagePh: "Cuéntanos sobre tu proyecto…",
        send: "Enviar mensaje", sending: "Enviando…",
        success: "¡Gracias! Hemos recibido tu mensaje y te responderemos muy pronto.",
        errName: "El nombre es obligatorio.", errEmail: "Introduce un correo válido.",
        errMessage: "Cuéntanos brevemente tu proyecto.",
        errSend: "No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos por email.",
        or: "O escríbenos directamente",
      },
    },
    footer: { tagline: "Software, automatización e inteligencia artificial para empresas.", made: "Estudio global · Diseñado y construido con precisión" },
    showcase: {
      eyebrow: "La plataforma", title: "Construimos software que se siente premium",
      lead: "Interfaces limpias, datos en tiempo real y analítica accionable. Construimos productos que tus usuarios disfrutan usar y que tu equipo puede escalar.",
      b1: { t: "Rápido", d: "experiencias instantáneas y optimizadas." },
      b2: { t: "Seguro", d: "buenas prácticas y datos protegidos por defecto." },
      b3: { t: "Escalable", d: "arquitectura lista para crecer contigo." },
      chartLabel: "Crecimiento mensual", chartDelta: "+38%", alt: "Captura de una plataforma de software de Juko AI",
      flow: {
        title: "Automatización", live: "En marcha",
        steps: [
          { t: "Evento recibido", s: "Webhook · Nuevo pedido" },
          { t: "Procesando datos", s: "Validación automática" },
          { t: "Agente IA", s: "Decisión generada" },
          { t: "Acción ejecutada", s: "Notificación · CRM" },
        ],
        metric: "Tareas automatizadas hoy", metricValue: "1,248", time: "Completado en 1.2s",
      },
    },
    servicesPage: { title: "Servicios que impulsan tu negocio", lead: "Del primer prototipo a la operación con IA en producción. Estas son las capacidades con las que ayudamos a empresas a crecer." },
    serviceDetail: { includes: "Qué incluye", stack: "Stack & herramientas", cta: "Hablemos de tu proyecto", others: "Otros servicios", highlights: "Resultados que buscamos" },
    projectsPage: { title: "Productos que hemos lanzado", lead: "Una selección de productos que hemos diseñado, construido y publicado para clientes reales en distintos países." },
    projectDetail: { overview: "Resumen", role: "Qué hicimos", stack: "Stack", visit: "Ver en vivo", cta: "¿Quieres algo así?", contactCta: "Empezar un proyecto", others: "Más proyectos" },
    notFound: { title: "Página no encontrada", back: "Volver al inicio" },
  },
  en: {
    nav: { services: "Services", work: "Work", process: "Process", about: "Studio", cta: "Let's talk" },
    hero: {
      badge: "The fastest to ship quality products",
      t1: "Automate", t2: "Build & Scale", t3: "with AI",
      lead: "We automate your processes, build custom apps and websites, and bring AI into your business. More results, less manual work and a product ready to grow.",
      cta1: "Tell us your idea", cta2: "View work", scroll: "Scroll",
      s1: "years shipping", s2: "live products", s3: "published apps", s4: "global reach",
      app: {
        brand: "Juko AI", panel: "Dashboard", live: "Live",
        metric: "Active automations", value: "1,248", growth: "+38% this month",
        rows: [
          { name: "AI Agent · Support", tag: "Active" },
          { name: "Flow · Billing", tag: "Auto" },
          { name: "App · Bookings", tag: "Online" },
        ],
        floatA: "Growth", floatAValue: "+38%",
        floatB: "AI · Summary ready",
      },
      dash: {
        title: "Control panel", sub: "Live overview",
        kpis: [
          { l: "Revenue", v: "€48.2k", d: "+24%" },
          { l: "Users", v: "9,312", d: "+12%" },
          { l: "Conversion", v: "6.8%", d: "+3%" },
        ],
        chart: "Revenue · 30 days", bars: "Activity", ring: "Goal", ringValue: "72%",
      },
    },
    services: {
      eyebrow: "What we do", title: "End-to-end services",
      sub: "One team, the full cycle: strategy, design, engineering and AI in production.",
      all: "View all services", more: "Learn more",
    },
    work: {
      eyebrow: "Selected work", title: "Real products, in production",
      sub: "SaaS platforms, mobile apps and corporate sites for clients across several countries, including Europe.",
      all: "All", mobile: "Mobile", viewAll: "View all projects", caseStudy: "View case", visit: "Visit site",
    },
    process: {
      eyebrow: "How we work", title: "From idea to product",
      sub: "A clear, fast, AI-powered process, without compromising engineering quality.",
      steps: [
        { t: "Discovery", d: "We understand your business and define scope, metrics and architecture." },
        { t: "Design & Prototype", d: "Premium UX/UI and clickable prototypes before building the final product." },
        { t: "AI-assisted Engineering", d: "We build with AI-assisted workflows: faster, secure and high quality." },
        { t: "Launch & Support", d: "We deploy, measure and iterate with you for the long run." },
      ],
    },
    about: {
      eyebrow: "The studio", title: "World-class engineering",
      p1: "Juko AI is a global software development and artificial intelligence studio. As a team, we design, build and maintain scalable web and mobile products, end to end, pairing strong engineering fundamentals with AI-assisted workflows.",
      p2: "We are technology-agnostic and learn fast: we adapt to your stack and deliver with speed, security and quality. We work with clients across several countries, including Europe, fully committed to a high-end, scalable product.",
      cta: "Work with us",
      kpis: [
        { v: "+5", l: "years of experience" },
        { v: "100%", l: "bespoke focus" },
        { v: "Global", l: "clients in several countries" },
        { v: "Web · Mobile · AI", l: "full-stack capabilities" },
      ],
    },
    contact: {
      eyebrow: "Let's talk", title: "Got a project in mind?",
      sub: "Tell us what you want to build. We reply fast!", wa: "WhatsApp",
      form: {
        name: "Name", email: "Email", company: "Company", companyOpt: "(optional)",
        message: "Message", namePh: "Your name", emailPh: "you@email.com",
        companyPh: "Your company name", messagePh: "Tell us about your project…",
        send: "Send message", sending: "Sending…",
        success: "Thanks! We've received your message and will get back to you very soon.",
        errName: "Name is required.", errEmail: "Enter a valid email.",
        errMessage: "Tell us briefly about your project.",
        errSend: "We couldn't send your message. Please try again or email us directly.",
        or: "Or reach us directly",
      },
    },
    footer: { tagline: "Software, automation and artificial intelligence for businesses.", made: "Global studio · Designed and built with precision" },
    showcase: {
      eyebrow: "The platform", title: "We build software that feels premium",
      lead: "Clean interfaces, real-time data and actionable analytics. We build products your users love to use, and your team can scale.",
      b1: { t: "Fast", d: "instant, optimized experiences." },
      b2: { t: "Secure", d: "best practices and protected data by default." },
      b3: { t: "Scalable", d: "architecture ready to grow with you." },
      chartLabel: "Monthly growth", chartDelta: "+38%", alt: "Screenshot of a Juko AI software platform",
      flow: {
        title: "Automation", live: "Running",
        steps: [
          { t: "Event received", s: "Webhook · New order" },
          { t: "Processing data", s: "Auto validation" },
          { t: "AI agent", s: "Decision generated" },
          { t: "Action executed", s: "Notification · CRM" },
        ],
        metric: "Tasks automated today", metricValue: "1,248", time: "Completed in 1.2s",
      },
    },
    servicesPage: { title: "Services that move your business", lead: "From the first prototype to AI running in production. These are the capabilities we use to help companies grow." },
    serviceDetail: { includes: "What's included", stack: "Stack & tools", cta: "Let's talk about your project", others: "Other services", highlights: "Outcomes we aim for" },
    projectsPage: { title: "Products we've launched", lead: "A selection of products we have designed, built and published for real clients across several countries." },
    projectDetail: { overview: "Overview", role: "What we did", stack: "Stack", visit: "View live", cta: "Want something like this?", contactCta: "Start a project", others: "More projects" },
    notFound: { title: "Page not found", back: "Back to home" },
  },
} as const;

export type Dict = (typeof dictionaries)["es"];

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] as Dict;
}
