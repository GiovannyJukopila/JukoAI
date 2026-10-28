import type { CSSProperties } from "react";
import Link from "next/link";
import { MOBILE_APPS, PROJECTS } from "@/lib/content";
import { getDict, type Locale } from "@/lib/i18n";
import { Reveal } from "../Reveal";
import { PhoneFrame } from "./Devices";
import { PlatformList, StoreBadge } from "./Stores";
import { visualOf } from "./visuals";
import { LogoMark } from "./screens/kit";

const accentOf = (slug: string) => PROJECTS.find((p) => p.slug === slug)?.accent ?? "#7752FE";

/* Band of the native apps that are live on the stores. */
export function AppsShowcase({ locale }: { locale: Locale }) {
  const a = getDict(locale).work.apps;

  return (
    <div className="apps">
      <Reveal className="apps__head">
        <span className="eyebrow">{a.eyebrow}</span>
        <h3 className="apps__title">{a.title}</h3>
        <p className="apps__sub">{a.sub}</p>
      </Reveal>

      <div className="apps__grid">
        {MOBILE_APPS.map((app, i) => {
          const visual = visualOf(app.project);
          const screen = visual.phones.find((p) => p.key === app.phone);
          return (
            <Reveal as="article" key={app.name} delay={i * 0.08} className="app-tile" style={{ "--accent": accentOf(app.project) } as CSSProperties}>
              <Link href={`/${locale}/proyectos/${app.project}`} className="app-tile__stage" aria-label={app.name}>
                <span className="stage-grid" aria-hidden="true" />
                {screen && <PhoneFrame className="app-tile__phone">{screen.node}</PhoneFrame>}
              </Link>
              <div className="app-tile__body">
                <div className="app-tile__id">
                  <span className="app-tile__icon"><LogoMark src={app.icon} size={40} round={app.project !== "neo-one"} /></span>
                  <div>
                    <h4>{app.name}</h4>
                    <span>{app.role[locale]}</span>
                  </div>
                </div>
                <PlatformList platforms={app.platforms} />
                <div className="app-tile__stores">
                  {app.stores.map((s) => <StoreBadge key={s.type} store={s} locale={locale} name={app.name} />)}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
