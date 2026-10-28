import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { BRANDS, NeoMemberApp, NeoMemberQr, NeoPanel, NeoScanner, NeoScannerAmount, NeoScannerPrizes, NeoWheel, type MemberBrand } from "./screens/NeoOne";
import {
  ComecaDesktop, ComecaMobile, CoosaludDesktop, CoosaludMobile, NeoAppDesktop, NeoAppMobile,
  NoirDesktop, NoirMobile, SportsDesktop, SportsMobile,
} from "./screens/Sites";
import { LogoMark } from "./screens/kit";

/* Which coded screens represent each project. No screenshots: every screen is built in code. */

type L = Record<Locale, string>;
export interface PhoneScreen { key: string; label: L; node: ReactNode }
export interface Visual {
  /** Desktop screen shown inside the browser chrome. */
  desktop?: ReactNode;
  /** Address shown in the browser bar; `null` hides it (e.g. a private admin panel). */
  domain?: string | null;
  phones: PhoneScreen[];
  mark?: ReactNode;
}

/* Digiclub: the white-label build. Brand tones from clients/digiclub/client.json, its real logo,
   and a sample promo poster from the NEO ONE site (not the client's own campaigns). */
const DIGICLUB: MemberBrand = {
  vendor: "Digiprint, Ltd", logo: "/projects/digiclub/logo.webp", user: "Maria", c1: "#334155", c2: "#64748B",
  scheme: "cashback", tiles: ["help", "groups"], promo: "/projects/neo-one/promo-cashback.webp", promoFooter: true,
  offersTab: "Offers", codeTab: "My QR",
  values: { value: "€18.40", earned: "€46.20", redeemed: "€27.80", act: "+€1.40", spend: "€28.00" },
};

export const VISUALS: Record<string, Visual> = {
  "neo-one": {
    desktop: <NeoPanel />,
    domain: null,
    mark: <LogoMark src="/projects/neo-one/neo-one-logo.webp" size={52} round={false} />,
    phones: [
      { key: "cashback", label: { es: "App de miembro · cashback", en: "Member app · cashback" }, node: <NeoMemberApp brand={BRANDS.aurora} /> },
      { key: "scanner", label: { es: "App de escáner · buscar al cliente", en: "Scanner app · find the customer" }, node: <NeoScanner /> },
      { key: "points", label: { es: "App de miembro · puntos", en: "Member app · points" }, node: <NeoMemberApp brand={BRANDS.smash} /> },
      { key: "visits", label: { es: "App de miembro · visitas y juegos", en: "Member app · visits & games" }, node: <NeoMemberApp brand={BRANDS.blade} /> },
      { key: "wheel", label: { es: "App de miembro · la ruleta", en: "Member app · the wheel" }, node: <NeoWheel /> },
      { key: "amount", label: { es: "App de escáner · sumar cashback", en: "Scanner app · add cashback" }, node: <NeoScannerAmount /> },
      { key: "prizes", label: { es: "App de escáner · canjear premios", en: "Scanner app · redeem prizes" }, node: <NeoScannerPrizes /> },
      { key: "qr", label: { es: "App de miembro · QR personal", en: "Member app · personal QR" }, node: <NeoMemberQr brand={BRANDS.aurora} /> },
    ],
  },
  coosalud: {
    desktop: <CoosaludDesktop />,
    phones: [{ key: "mobile", label: { es: "Portada en móvil", en: "Home on mobile" }, node: <CoosaludMobile /> }],
  },
  comeca: {
    desktop: <ComecaDesktop />,
    phones: [{ key: "mobile", label: { es: "Portada en móvil", en: "Home on mobile" }, node: <ComecaMobile /> }],
  },
  noir: {
    desktop: <NoirDesktop />,
    phones: [{ key: "mobile", label: { es: "Portada en móvil", en: "Home on mobile" }, node: <NoirMobile /> }],
  },
  digiclub: {
    mark: <LogoMark src="/projects/digiclub/logo.webp" size={52} />,
    phones: [
      { key: "home", label: { es: "Inicio · cashback", en: "Home · cashback" }, node: <NeoMemberApp brand={DIGICLUB} /> },
      { key: "qr", label: { es: "QR personal para caja", en: "Personal QR for the till" }, node: <NeoMemberQr brand={DIGICLUB} code="DGC48K2QAZ" /> },
    ],
  },
  "neoapp-sports": {
    desktop: <SportsDesktop />,
    phones: [{ key: "mobile", label: { es: "Acceso en móvil", en: "Sign-in on mobile" }, node: <SportsMobile /> }],
  },
  "neo-app-international": {
    desktop: <NeoAppDesktop />,
    phones: [{ key: "mobile", label: { es: "Portada en móvil", en: "Home on mobile" }, node: <NeoAppMobile /> }],
  },
};

export function visualOf(slug: string): Visual {
  return VISUALS[slug] ?? { phones: [] };
}
