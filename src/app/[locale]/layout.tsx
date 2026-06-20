import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Ambient } from "@/components/Ambient";
import { Cursor } from "@/components/Cursor";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { locales, isLocale, type Locale } from "@/lib/i18n";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL("https://juko.ai"),
  title: { default: "Juko AI · Software & Inteligencia Artificial", template: "%s · Juko AI" },
  description: "Estudio de desarrollo de software, automatización e implementación de flujos con IA. Web, móvil, agentes y cloud. Proyectos entregados en Europa.",
  openGraph: {
    type: "website",
    title: "Juko AI · Software & Inteligencia Artificial",
    description: "Construimos software, automatización y agentes con IA para empresas. Web · Móvil · Cloud.",
    siteName: "Juko AI",
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%23190482'/%3E%3Ctext x='50' y='68' font-family='Arial' font-size='56' font-weight='700' fill='%23C2D9FF' text-anchor='middle'%3EJ%3C/text%3E%3C/svg%3E",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;

  return (
    <html lang={lc} className={`${display.variable} ${body.variable}`}>
      <body>
        <Cursor />
        <Ambient />
        <Nav locale={lc} />
        <main>{children}</main>
        <WhatsAppFab />
        <Footer locale={lc} />
      </body>
    </html>
  );
}
