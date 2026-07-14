import type { Metadata } from "next";
import { cookies } from "next/headers";
import "../globals.css";
import { AppChrome } from "./_components/AppChrome";
import { LangProvider, type Lang } from "./_i18n";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/server/auth/session";

// Separate root layout for the internal tool (not localized, not the marketing site).
export const metadata: Metadata = {
  title: "Juko Prospect · Herramienta interna",
  robots: { index: false, follow: false }, // never index the internal tool
};

export default async function ProspectLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();

  // Resolve the current user (auth is only enforced when configured).
  const enabled = authEnabled();
  let user: string | null = null;
  if (enabled) {
    user = await verifySession(c.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET ?? "");
  }
  const showChrome = !enabled || !!user;
  // Default to English on first visit; respect the saved preference afterwards.
  const lang: Lang = c.get("prospect_lang")?.value === "es" ? "es" : "en";

  return (
    <html lang={lang}>
      <body className="min-h-screen bg-[#070612] text-[var(--ink)] antialiased">
        <LangProvider initialLang={lang}>
          <AppChrome user={user} showChrome={showChrome}>
            {children}
          </AppChrome>
        </LangProvider>
      </body>
    </html>
  );
}
