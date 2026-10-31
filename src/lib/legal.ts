import type { Locale } from "./i18n";
import { SITE_URL } from "./seo";

/*
 * Who answers for the site and its data, and the two legal documents built from it.
 * Juko AI is the trade name of two brothers, natural persons acting as joint controllers (Colombia); the policy follows Ley 1581 de 2012 and
 * Decreto 1377 de 2013 (art. 13 lists what it must say), with a section for visitors from the EU (GDPR).
 * Change VERSION and EFFECTIVE whenever the policy changes: the contact form records the version each visitor accepted.
 */
export const LEGAL = {
  // joint controllers of the data; no street address while they work without an office (add it with the S.A.S.)
  owners: ["Giovanny Zdenco Jukopila Rueda", "Yango Zdenco Jukopila Rueda"],
  city: "Cartagena de Indias",
  country: "Colombia",
  email: "contacto@jukoai.com",
  phone: "+57 300 512 0188",
  version: "1.0",
  effective: "2026-10-30",
};

export type LegalBlock = string | { list: string[] } | { facts: [string, string][] };
export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };
export type LegalDoc = { title: string; lead: string; sections: LegalSection[] };
export type LegalKind = "privacy" | "terms";

export const LEGAL_PATH: Record<LegalKind, string> = { privacy: "/privacidad", terms: "/terminos" };

const site = SITE_URL.replace(/^https?:\/\//, "");
const { city, country, email, phone, version } = LEGAL;

// "A y B" / "A and B"
const ownersText = (locale: Locale) => LEGAL.owners.join(locale === "en" ? " and " : " y ");
const ownersEs = ownersText("es");
const ownersEn = ownersText("en");

export function effectiveDate(locale: Locale) {
  return new Date(`${LEGAL.effective}T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : "es-CO", { day: "numeric", month: "long", year: "numeric" });
}

/* Inline marks in the texts: **bold** and [label](href). */

function privacyEs(): LegalDoc {
  return {
    title: "Política de Tratamiento de Datos Personales",
    lead: "Qué datos recogemos, para qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.",
    sections: [
      { id: "responsable", title: "Responsable del tratamiento", blocks: [
        { facts: [
          ["Corresponsables", `${ownersEs}, personas naturales que operan con el nombre comercial Juko AI`],
          ["Domicilio", `${city}, ${country}`],
          ["Correo", email],
          ["Teléfono / WhatsApp", phone],
          ["Sitio web", site],
        ] },
      ] },
      { id: "datos", title: "Qué datos recogemos", blocks: [
        { list: [
          "**Los que nos das** en el formulario de contacto o en el cotizador: nombre, correo, empresa y WhatsApp (estos dos últimos opcionales), y lo que nos cuentas de tu proyecto (necesidades, etapa, plazo y mensaje).",
          "**Los que nos envías** si nos escribes por WhatsApp o por correo.",
          "**Datos técnicos mínimos:** la dirección IP, que usamos solo para frenar envíos abusivos del formulario y no guardamos, y el país aproximado que informa nuestro proveedor de alojamiento, para mostrarte el WhatsApp de tu región.",
        ] },
        "No pedimos datos sensibles ni datos de niñas, niños o adolescentes. Por favor no los incluyas en tus mensajes.",
      ] },
      { id: "finalidades", title: "Para qué los usamos", blocks: [
        { list: [
          "Responder tu solicitud y preparar y enviarte una cotización o propuesta.",
          "Contactarte por correo, teléfono o WhatsApp sobre esa solicitud y hacerle seguimiento.",
          "Si nos contratas: ejecutar el contrato, facturar y cumplir nuestras obligaciones legales, contables y tributarias.",
          "Proteger el sitio frente a fraudes y abusos.",
        ] },
        "No vendemos ni cedemos tus datos, y no te enviaremos publicidad ni boletines sin una autorización adicional y expresa.",
      ] },
      { id: "autorizacion", title: "Tu autorización", blocks: [
        "Al marcar la casilla del formulario nos das tu autorización previa, expresa e informada para tratar tus datos con las finalidades anteriores. Guardamos la fecha y la hora de esa autorización y la versión de esta política que aceptaste, como prueba.",
        "Puedes revocarla cuando quieras, como se explica en la sección «Cómo ejercer tus derechos».",
      ] },
      { id: "terceros", title: "Con quién los compartimos", blocks: [
        "Solo con proveedores que nos ayudan a operar, que actúan como encargados del tratamiento y únicamente para las finalidades de esta política:",
        { list: [
          "**Google** (correo electrónico), donde recibimos y respondemos tu solicitud.",
          "**Vercel**, que aloja este sitio web.",
          "**Meta (WhatsApp)**, si decides escribirnos por WhatsApp.",
        ] },
        "Tu solicitud la reciben solo las personas del equipo de Juko AI que atienden las cotizaciones.",
        "Estos proveedores pueden procesar datos fuera de Colombia, principalmente en Estados Unidos, país que la Superintendencia de Industria y Comercio (SIC) reconoce con un nivel adecuado de protección. También entregaremos datos a una autoridad cuando una ley o una orden judicial lo exija.",
      ] },
      { id: "derechos", title: "Tus derechos", blocks: [
        "Como titular de los datos puedes:",
        { list: [
          "Conocer, actualizar y rectificar tus datos.",
          "Pedir prueba de la autorización que nos diste.",
          "Saber, si lo pides, qué uso le hemos dado a tus datos.",
          "Revocar la autorización y pedir que borremos tus datos, salvo que una ley o un contrato nos obligue a conservarlos.",
          "Acceder gratis a tus datos.",
          "Presentar quejas ante la SIC, después de haber hecho tu consulta o reclamo con nosotros.",
        ] },
      ] },
      { id: "ejercer", title: "Cómo ejercer tus derechos", blocks: [
        `Escríbenos a [${email}](mailto:${email}) con el asunto «Datos personales», tu nombre, el correo o teléfono con el que nos contactaste y lo que necesitas. Puede atenderlas cualquiera de los dos corresponsables, y te responde quien la reciba primero.`,
        { list: [
          "**Consultas:** te respondemos en un máximo de 10 días hábiles. Si no fuera posible, te explicamos el motivo y respondemos dentro de los 5 días hábiles siguientes.",
          "**Reclamos** (corregir, actualizar o borrar datos, o revocar la autorización): te respondemos en un máximo de 15 días hábiles. Si no fuera posible, te explicamos el motivo y respondemos dentro de los 8 días hábiles siguientes.",
          "Si al reclamo le falta información, te la pedimos dentro de los 5 días siguientes. Si pasan 2 meses sin que la envíes, entenderemos que desististe.",
        ] },
      ] },
      { id: "conservacion", title: "Cuánto tiempo los guardamos", blocks: [
        "Mientras sean necesarios para atender tu solicitud y hacerle seguimiento, y como máximo 2 años desde nuestro último contacto si no llegamos a trabajar juntos. Si nos contratas, durante la relación y el tiempo que exijan las normas contables, tributarias y comerciales.",
      ] },
      { id: "seguridad", title: "Seguridad", blocks: [
        "Usamos conexión cifrada (HTTPS), acceso restringido y verificación en dos pasos en las cuentas donde recibimos tu información. Ningún sistema es infalible: si ocurre un incidente que afecte tus datos, lo informaremos a la SIC y a ti cuando corresponda.",
      ] },
      { id: "cookies", title: "Cookies y almacenamiento local", blocks: [
        "Este sitio no usa cookies de analítica ni de publicidad. Solo usa:",
        { list: [
          "**juko-region**, una cookie técnica de 7 días que guarda tu región para mostrarte el WhatsApp que te corresponde.",
          "El almacenamiento de tu navegador, para recordar si prefieres el tema claro u oscuro y para no repetirte la animación de entrada en la misma visita.",
        ] },
        "Ninguno te identifica. Si en el futuro añadimos analítica, actualizaremos esta política y te pediremos consentimiento cuando la ley lo exija.",
      ] },
      { id: "ue", title: "Si estás en la Unión Europea", blocks: [
        "Además de lo anterior, el Reglamento General de Protección de Datos (RGPD) te da derecho a acceder, rectificar, suprimir, limitar y oponerte al tratamiento, a la portabilidad de tus datos y a retirar tu consentimiento en cualquier momento.",
        "Tratamos tus datos con base en tu consentimiento y para aplicar medidas precontractuales que tú pides, como una cotización (artículo 6.1, letras a y b, del RGPD). Tus datos se tratan en Colombia y en Estados Unidos. Puedes reclamar ante la autoridad de protección de datos de tu país.",
      ] },
      { id: "vigencia", title: "Vigencia y cambios", blocks: [
        `Esta es la versión ${version} de la política. La base de datos estará vigente mientras se mantengan las finalidades descritas.`,
        "Si hacemos cambios importantes, publicaremos la nueva versión en esta página con su fecha y, si cambian las finalidades, te pediremos una nueva autorización.",
      ] },
    ],
  };
}

function privacyEn(): LegalDoc {
  return {
    title: "Personal Data Policy",
    lead: "What data we collect, what we use it for, who we share it with and how you can exercise your rights, under Colombian Law 1581 of 2012 and Decree 1377 of 2013, and the GDPR for visitors from the EU.",
    sections: [
      { id: "responsable", title: "Data controller", blocks: [
        { facts: [
          ["Joint controllers", `${ownersEn}, natural persons trading as Juko AI`],
          ["Domicile", `${city}, ${country}`],
          ["Email", email],
          ["Phone / WhatsApp", phone],
          ["Website", site],
        ] },
      ] },
      { id: "datos", title: "What data we collect", blocks: [
        { list: [
          "**What you give us** in the contact form or the quote builder: name, email, company and WhatsApp (the last two optional), and what you tell us about your project (needs, stage, timing and message).",
          "**What you send us** if you write to us on WhatsApp or by email.",
          "**Minimal technical data:** your IP address, used only to stop abusive form submissions and never stored, and the approximate country our hosting provider reports, to show you the WhatsApp number for your region.",
        ] },
        "We do not ask for sensitive data or data about children. Please do not include it in your messages.",
      ] },
      { id: "finalidades", title: "What we use it for", blocks: [
        { list: [
          "Answering your request and preparing and sending you a quote or proposal.",
          "Contacting you by email, phone or WhatsApp about that request and following it up.",
          "If you hire us: performing the contract, invoicing and meeting our legal, accounting and tax obligations.",
          "Protecting the site against fraud and abuse.",
        ] },
        "We do not sell or hand over your data, and we will not send you advertising or newsletters without a separate, explicit authorisation.",
      ] },
      { id: "autorizacion", title: "Your authorisation", blocks: [
        "By ticking the box in the form you give us your prior, explicit and informed authorisation to process your data for the purposes above. As proof, we keep the date and time of that authorisation and the version of this policy you accepted.",
        "You can withdraw it at any time, as explained in “How to exercise your rights”.",
      ] },
      { id: "terceros", title: "Who we share it with", blocks: [
        "Only with providers that help us operate, acting as processors and only for the purposes of this policy:",
        { list: [
          "**Google** (email), where we receive and answer your request.",
          "**Vercel**, which hosts this website.",
          "**Meta (WhatsApp)**, if you choose to write to us on WhatsApp.",
        ] },
        "Your request reaches only the members of the Juko AI team who handle quotes.",
        "These providers may process data outside Colombia, mainly in the United States, a country the Colombian data protection authority (SIC) recognises as providing an adequate level of protection. We will also hand data to an authority when a law or a court order requires it.",
      ] },
      { id: "derechos", title: "Your rights", blocks: [
        "As the data subject you can:",
        { list: [
          "Know, update and correct your data.",
          "Ask for proof of the authorisation you gave us.",
          "Find out, on request, how we have used your data.",
          "Withdraw your authorisation and ask us to delete your data, unless a law or a contract requires us to keep it.",
          "Access your data free of charge.",
          "Complain to the SIC, after first raising your query or claim with us.",
        ] },
      ] },
      { id: "ejercer", title: "How to exercise your rights", blocks: [
        `Write to [${email}](mailto:${email}) with the subject “Personal data”, your name, the email or phone you contacted us with and what you need. Either of the two joint controllers can handle them, and whoever receives yours first replies.`,
        { list: [
          "**Queries:** we reply within 10 working days at most. If that is not possible, we tell you why and reply within the following 5 working days.",
          "**Claims** (correcting, updating or deleting data, or withdrawing your authorisation): we reply within 15 working days at most. If that is not possible, we tell you why and reply within the following 8 working days.",
          "If a claim is missing information, we ask for it within 5 days. If 2 months pass without it, we will consider the claim withdrawn.",
        ] },
      ] },
      { id: "conservacion", title: "How long we keep it", blocks: [
        "For as long as we need it to answer and follow up your request, and at most 2 years from our last contact if we do not end up working together. If you hire us, for the length of the relationship and as long as accounting, tax and commercial rules require.",
      ] },
      { id: "seguridad", title: "Security", blocks: [
        "We use encrypted connections (HTTPS), restricted access and two-step verification on the accounts where we receive your information. No system is infallible: if an incident affects your data, we will report it to the SIC and to you where required.",
      ] },
      { id: "cookies", title: "Cookies and local storage", blocks: [
        "This site uses no analytics or advertising cookies. It only uses:",
        { list: [
          "**juko-region**, a 7-day technical cookie that stores your region to show you the right WhatsApp number.",
          "Your browser's storage, to remember whether you prefer the light or dark theme and to skip the intro animation within the same visit.",
        ] },
        "None of them identifies you. If we add analytics in the future, we will update this policy and ask for your consent where the law requires it.",
      ] },
      { id: "ue", title: "If you are in the European Union", blocks: [
        "On top of the above, the General Data Protection Regulation (GDPR) gives you the right to access, rectify, erase, restrict and object to processing, to data portability and to withdraw your consent at any time.",
        "We process your data on the basis of your consent and to take pre-contractual steps you ask for, such as a quote (Article 6(1)(a) and (b) GDPR). Your data is processed in Colombia and the United States. You can complain to the data protection authority of your country.",
      ] },
      { id: "vigencia", title: "Validity and changes", blocks: [
        `This is version ${version} of the policy. The database remains in force for as long as the purposes described remain.`,
        "If we make significant changes, we will publish the new version on this page with its date and, if the purposes change, ask you for a new authorisation.",
      ] },
    ],
  };
}

function termsEs(locale: Locale): LegalDoc {
  const privacy = `/${locale}${LEGAL_PATH.privacy}`;
  return {
    title: "Términos y Condiciones de Uso",
    lead: `Estas condiciones regulan el uso de ${site}. Al navegar el sitio las aceptas; si no estás de acuerdo, por favor no lo uses.`,
    sections: [
      { id: "quienes", title: "Quiénes somos", blocks: [
        `Juko AI es el nombre comercial con el que ${ownersEs}, personas naturales con domicilio en ${city}, ${country}, presta servicios de desarrollo de software, automatización e inteligencia artificial. Puedes escribirnos a [${email}](mailto:${email}).`,
      ] },
      { id: "uso", title: "Uso del sitio", blocks: [
        "El contenido del sitio es informativo. Te comprometes a usarlo de forma lícita y, en particular, a no:",
        { list: [
          "Intentar acceder sin autorización a sistemas, cuentas o datos, ni dañar, sobrecargar o interrumpir el sitio.",
          "Extraer su contenido de forma masiva o automatizada.",
          "Enviar formularios con datos de otra persona sin su permiso, o enviarlos de forma automatizada.",
        ] },
      ] },
      { id: "cotizaciones", title: "Cotizaciones y propuestas", blocks: [
        "Las cotizaciones, precios y plazos que damos, incluidos los del cotizador del sitio, son orientativos y **no son una oferta vinculante**. Un proyecto solo nos obliga cuando ambas partes firman una propuesta o un contrato, que fija el alcance, el precio, las entregas, la propiedad del código y las garantías.",
        "Los tiempos de respuesta que mencionamos en el sitio son un compromiso de servicio que cuidamos, no una garantía contractual.",
      ] },
      { id: "propiedad", title: "Propiedad intelectual", blocks: [
        "Los textos, diseños, logotipo, ilustraciones, animaciones y código de este sitio pertenecen a Juko AI o se usan con licencia, y están protegidos por las normas de derechos de autor (Ley 23 de 1982 y Decisión Andina 351 de 1993). Juko AI™ es un nombre comercial en uso.",
        "No puedes copiarlos, reproducirlos ni usarlos con fines comerciales sin nuestra autorización escrita. Las marcas y logotipos de terceros que aparecen en el sitio pertenecen a sus titulares y se muestran solo con fines informativos.",
      ] },
      { id: "proyectos", title: "Proyectos mostrados", blocks: [
        "Los proyectos del portafolio se publican con autorización de los clientes o con información que no es confidencial. Los resultados de un proyecto no garantizan resultados iguales en otro.",
      ] },
      { id: "enlaces", title: "Enlaces a terceros", blocks: [
        "El sitio enlaza a servicios de terceros, como WhatsApp, LinkedIn o GitHub. No controlamos su contenido ni sus políticas, y no respondemos por ellos.",
      ] },
      { id: "responsabilidad", title: "Responsabilidad", blocks: [
        "Procuramos que la información del sitio sea exacta y esté disponible, pero puede contener errores o interrumpirse. En la medida en que la ley lo permita, Juko AI no responde por daños derivados del uso del sitio, de la imposibilidad de usarlo o de decisiones tomadas solo con base en su contenido.",
        "Nada de lo anterior limita los derechos que la ley no permite limitar.",
      ] },
      { id: "datos", title: "Datos personales", blocks: [
        `Tratamos los datos que nos envías según nuestra [Política de Tratamiento de Datos](${privacy}).`,
      ] },
      { id: "cambios", title: "Cambios", blocks: [
        "Podemos actualizar estos términos. La versión vigente es siempre la publicada en esta página, con su fecha.",
      ] },
      { id: "ley", title: "Ley aplicable", blocks: [
        `Estos términos se rigen por las leyes de la República de Colombia. Ante cualquier diferencia buscaremos primero un arreglo directo; si no es posible, la resolverán los jueces competentes de ${city}, ${country}, sin perjuicio de los derechos que te reconozcan las normas imperativas de tu país.`,
      ] },
    ],
  };
}

function termsEn(locale: Locale): LegalDoc {
  const privacy = `/${locale}${LEGAL_PATH.privacy}`;
  return {
    title: "Terms and Conditions of Use",
    lead: `These terms govern the use of ${site}. By browsing the site you accept them; if you do not agree, please do not use it.`,
    sections: [
      { id: "quienes", title: "Who we are", blocks: [
        `Juko AI is the trade name under which ${ownersEn}, natural persons domiciled in ${city}, ${country}, provides software development, automation and artificial intelligence services. You can write to us at [${email}](mailto:${email}).`,
      ] },
      { id: "uso", title: "Use of the site", blocks: [
        "The content of the site is for information. You agree to use it lawfully and, in particular, not to:",
        { list: [
          "Try to access systems, accounts or data without authorisation, or damage, overload or disrupt the site.",
          "Extract its content in bulk or by automated means.",
          "Submit forms with another person's details without their permission, or submit them by automated means.",
        ] },
      ] },
      { id: "cotizaciones", title: "Quotes and proposals", blocks: [
        "The quotes, prices and timelines we give, including those from the site's quote builder, are estimates and **not a binding offer**. A project only binds us once both parties sign a proposal or contract setting out the scope, price, deliverables, code ownership and warranties.",
        "The response times we mention on the site are a service commitment we take care of, not a contractual guarantee.",
      ] },
      { id: "propiedad", title: "Intellectual property", blocks: [
        "The texts, designs, logo, illustrations, animations and code of this site belong to Juko AI or are used under licence, and are protected by copyright law (Colombian Law 23 of 1982 and Andean Decision 351 of 1993). Juko AI™ is a trade name in use.",
        "You may not copy, reproduce or use them commercially without our written permission. Third-party marks and logos on the site belong to their owners and are shown for information only.",
      ] },
      { id: "proyectos", title: "Projects shown", blocks: [
        "Portfolio projects are published with the clients' permission or with information that is not confidential. The results of one project do not guarantee the same results in another.",
      ] },
      { id: "enlaces", title: "Third-party links", blocks: [
        "The site links to third-party services such as WhatsApp, LinkedIn or GitHub. We do not control their content or policies and are not responsible for them.",
      ] },
      { id: "responsabilidad", title: "Liability", blocks: [
        "We try to keep the site's information accurate and available, but it may contain errors or be interrupted. To the extent the law allows, Juko AI is not liable for damages arising from using the site, being unable to use it, or decisions based solely on its content.",
        "Nothing above limits rights that the law does not allow to be limited.",
      ] },
      { id: "datos", title: "Personal data", blocks: [
        `We process the data you send us under our [Personal Data Policy](${privacy}).`,
      ] },
      { id: "cambios", title: "Changes", blocks: [
        "We may update these terms. The version in force is always the one published on this page, with its date.",
      ] },
      { id: "ley", title: "Governing law", blocks: [
        `These terms are governed by the laws of the Republic of Colombia. We will first seek to settle any dispute directly; failing that, it will be resolved by the competent courts of ${city}, ${country}, without prejudice to the rights granted to you by the mandatory rules of your country.`,
      ] },
    ],
  };
}

export function getLegalDoc(kind: LegalKind, locale: Locale): LegalDoc {
  if (kind === "privacy") return locale === "en" ? privacyEn() : privacyEs();
  return locale === "en" ? termsEn(locale) : termsEs(locale);
}
