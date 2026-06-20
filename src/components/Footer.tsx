import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import { SOCIAL } from "@/lib/content";

export function Footer({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <span className="nav__logo-text" style={{ fontSize: "1.4rem" }}>Juko<b>AI</b></span>
          <p>{dict.footer.tagline}</p>
        </div>
        <div className="footer__links">
          <Link href={`/${locale}/servicios`}>{dict.nav.services}</Link>
          <Link href={`/${locale}/proyectos`}>{dict.nav.work}</Link>
          <a href={SOCIAL.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={SOCIAL.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={SOCIAL.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </div>
      <div className="footer__bottom">
        <span>© {year} Juko AI</span>
        <span>{dict.footer.made}</span>
      </div>
    </footer>
  );
}
