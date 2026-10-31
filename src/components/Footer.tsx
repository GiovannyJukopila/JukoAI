import Link from "next/link";
import { LogoMark } from "./icons";
import { getDict, type Locale } from "@/lib/i18n";
import { SOCIAL } from "@/lib/content";
import { WhatsAppLink } from "./WhatsAppLink";
import { LEGAL, LEGAL_PATH } from "@/lib/legal";

export function Footer({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <span className="footer__brand-mark">
            <LogoMark size={26} />
            <span className="nav__logo-text" style={{ fontSize: "1.4rem" }}>Juko<b>AI</b></span>
          </span>
          <p>{dict.footer.tagline}</p>
        </div>
        <div className="footer__links">
          <Link href={`/${locale}/servicios`}>{dict.nav.services}</Link>
          <Link href={`/${locale}/proyectos`}>{dict.nav.work}</Link>
          <a href={SOCIAL.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={SOCIAL.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <WhatsAppLink>WhatsApp</WhatsAppLink>
        </div>
      </div>
      {/* the legal documents; who stands behind the trade name is in the policy and the terms */}
      <div className="footer__legal">
        <nav className="footer__legal-links" aria-label={dict.footer.legal}>
          <Link href={`/${locale}${LEGAL_PATH.privacy}`}>{dict.footer.privacy}</Link>
          <Link href={`/${locale}${LEGAL_PATH.terms}`}>{dict.footer.terms}</Link>
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
        </nav>
        <p className="footer__owner">{LEGAL.city}, {LEGAL.country}</p>
      </div>
      <div className="footer__bottom">
        <span>© {year} Juko AI™. {dict.footer.rights}</span>
        <span>{dict.footer.made}</span>
      </div>
    </footer>
  );
}
