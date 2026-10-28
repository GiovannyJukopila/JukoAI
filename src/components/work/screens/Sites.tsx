import Image from "next/image";
import { CoosaludMark, Ico, LogoMark } from "./kit";
import { ParticleField } from "./ParticleField";

/*
 * Client websites, rebuilt in code from their own sources:
 *  - Coosalud   → coosalud-web (tokens.css, homepage.json, coosalud-mark.tsx)
 *  - COMECA     → comeca hero-section.component.ts (_tokens.scss, Barlow Condensed)
 *  - NOIR       → barber-web-template-cinematic-scroll (index.html, styles.css)
 *  - NeoApp     → neoappgym.com sign-in
 *  - NEO APP    → neo-app.eu hero
 */

/* ---------------- Coosalud ---------------- */

const COOS_STATS: [string, string][] = [["30+", "Años de Experiencia"], ["Top 300", "Cooperativa Mundial"], ["$50M+", "en Crediaportes"], ["98%", "Satisfacción"]];

function CoosaludLogo() {
  return (
    <div className="cx-logo">
      <CoosaludMark size={46} />
      <div><b>Cooperativa</b><b>Coosalud</b><small>Crecemos a tu lado</small></div>
    </div>
  );
}

export function CoosaludDesktop() {
  return (
    <div className="cx cx--desk">
      <span className="cx__aurora" />
      <header className="cx__nav">
        <CoosaludLogo />
        <nav>
          <span className="is-on">Inicio</span><span>Conócenos</span><span>Asociados</span>
          <span>Servicios <Ico name="down" size={14} /></span><span>Información <Ico name="down" size={14} /></span>
        </nav>
        <div className="cx__nav-cta">
          <span className="cx__mail"><Ico name="mail" size={16} /> Correo</span>
          <span className="cx__pse"><i>pse</i><span>Pagos seguros<br />en línea</span></span>
        </div>
      </header>

      <div className="cx__hero">
        <div className="cx__card">
          <span className="cx__line" />
          <h1>Bienvenidos a Coosalud</h1>
          <p>Tu cooperativa de confianza, comprometida con tu bienestar y desarrollo integral</p>
          <div className="cx__btns">
            <span className="cx__btn">Hazte Asociado <Ico name="arrow" size={18} /></span>
            <span className="cx__btn cx__btn--ghost">Conócenos Más</span>
          </div>
        </div>
        <div className="cx__photo">
          <span className="cx__ring" />
          <Image src="/projects/coosalud/hero.webp" alt="" fill sizes="600px" />
        </div>
      </div>

      <div className="cx__stats">
        {COOS_STATS.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
      </div>

      <span className="cx__fab cx__fab--pse">pse</span>
      <span className="cx__fab cx__fab--wa"><Ico name="phone" size={24} /></span>
    </div>
  );
}

export function CoosaludMobile() {
  return (
    <div className="cx cx--mob">
      <span className="cx__aurora" />
      <header className="cx__nav">
        <CoosaludLogo />
        <span className="cx__burger"><Ico name="menu" size={24} /></span>
      </header>
      <div className="cx__card">
        <span className="cx__line" />
        <h1>Bienvenidos a Coosalud</h1>
        <p>Tu cooperativa de confianza, comprometida con tu bienestar y desarrollo integral</p>
        <div className="cx__btns">
          <span className="cx__btn">Hazte Asociado <Ico name="arrow" size={17} /></span>
          <span className="cx__btn cx__btn--ghost">Conócenos Más</span>
        </div>
      </div>
      <div className="cx__photo">
        <span className="cx__ring" />
        <Image src="/projects/coosalud/hero.webp" alt="" fill sizes="300px" />
      </div>
      <div className="cx__stats">
        {COOS_STATS.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
      </div>
      <span className="cx__fab cx__fab--wa"><Ico name="phone" size={22} /></span>
    </div>
  );
}

/* ---------------- COMECA ---------------- */

const COMECA_METRICS: [string, string][] = [["+30", "Años de experiencia"], ["+200", "Proyectos ejecutados"], ["ISO", "9001 certificada"], ["11k", "m² de planta"]];

function ComecaLogo() {
  return (
    <div className="mx-logo">
      <LogoMark src="/projects/comeca/mark.webp" size={42} round={false} />
      <div><b>COMECA</b><small>Construcciones Metálicas del Caribe</small></div>
    </div>
  );
}

function ComecaBg() {
  return (
    <>
      <Image src="/projects/comeca/plant.webp" alt="" fill sizes="1000px" className="mx__photo" />
      <span className="mx__overlay" />
      <span className="mx__grid" />
    </>
  );
}

export function ComecaDesktop() {
  return (
    <div className="mx mx--desk">
      <ComecaBg />
      <header className="mx__nav">
        <ComecaLogo />
        <nav><span>Servicios</span><span>Industrias</span><span>Proyectos</span><span>Proceso</span><span>Nosotros</span><span>Contacto</span></nav>
        <span className="mx__cta">Cotiza tu Proyecto <Ico name="arrow" size={16} /></span>
      </header>
      <div className="mx__body">
        <span className="mx__badge">🏗️ Ingeniería de Precisión</span>
        <h1>
          <span className="mx__t1"><span>Ingeniería</span> <span>Metalmecánica</span></span>
          <span className="mx__t2"><i />para la Gran Industria</span>
        </h1>
        <p>Desde el <strong>Parque Industrial Bayunca</strong>, diseñamos, fabricamos e instalamos equipos y estructuras metálicas para <strong>construcción, minería, energía y manufactura.</strong> Más de 30 años de ingeniería metalmecánica certificada.</p>
        <div className="mx__btns">
          <span className="mx__btn">Cotiza tu Proyecto <Ico name="arrow" size={18} /></span>
          <span className="mx__btn mx__btn--ghost">Ver Nuestros Proyectos <Ico name="down" size={18} /></span>
        </div>
        <div className="mx__metrics">
          {COMECA_METRICS.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
        </div>
      </div>
      <span className="mx__scroll"><i /></span>
    </div>
  );
}

export function ComecaMobile() {
  return (
    <div className="mx mx--mob">
      <ComecaBg />
      <header className="mx__nav">
        <ComecaLogo />
        <span className="mx__burger"><Ico name="menu" size={24} /></span>
      </header>
      <div className="mx__body">
        <span className="mx__badge">🏗️ Ingeniería de Precisión</span>
        <h1>
          <span className="mx__t1"><span>Ingeniería</span> <span>Metalmecánica</span></span>
          <span className="mx__t2"><i />para la Gran Industria</span>
        </h1>
        <p>Desde el <strong>Parque Industrial Bayunca</strong>, diseñamos, fabricamos e instalamos estructuras metálicas para <strong>construcción, minería, energía y manufactura.</strong></p>
        <div className="mx__btns">
          <span className="mx__btn">Cotiza tu Proyecto <Ico name="arrow" size={17} /></span>
          <span className="mx__btn mx__btn--ghost">Ver Proyectos <Ico name="down" size={17} /></span>
        </div>
        <div className="mx__metrics">
          {COMECA_METRICS.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
        </div>
      </div>
    </div>
  );
}

/* ---------------- NOIR Barber Co. ---------------- */

function NoirHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="nx__hdr">
      <span className="nx__brand"><b>NOIR</b><span>Barber Co.</span></span>
      <nav>
        {!compact && <><span>Services</span><span>The Ritual</span><span>Reviews</span></>}
        <span className="is-solid">Book a chair</span>
      </nav>
    </header>
  );
}

export function NoirDesktop() {
  return (
    <div className="nx nx--desk">
      <ParticleField shape="pole" className="nx__gl" width={760} height={900} />
      <span className="nx__vignette" />
      <NoirHeader />
      <div className="nx__copy">
        <div className="nx__label"><i /><span>Est. 2014 · Gentlemen&apos;s Barbershop</span></div>
        <h1>Precision is a <em>ritual.</em></h1>
        <span className="nx__rule" />
        <p>Classic cuts, hot-towel shaves and beard work by master barbers — in a quiet room built for the hour you take for yourself.</p>
        <div className="nx__ctas"><span className="nx__btn">Book a chair <i>→</i></span><span className="nx__btn nx__btn--ghost">View the menu</span></div>
      </div>
      <div className="nx__card"><div className="nx__ck"><i /><span>Open today</span></div><b>09:00 — 20:00</b><small>Walk-ins welcome before noon. Appointments recommended after.</small></div>
      <span className="nx__cue">[ Scroll ]</span>
    </div>
  );
}

export function NoirMobile() {
  return (
    <div className="nx nx--mob">
      <ParticleField shape="pole" className="nx__gl" width={390} height={520} />
      <span className="nx__vignette" />
      <NoirHeader compact />
      <div className="nx__copy">
        <div className="nx__label"><i /><span>Est. 2014 · Barbershop</span></div>
        <h1>Precision is a <em>ritual.</em></h1>
        <span className="nx__rule" />
        <p>Classic cuts, hot-towel shaves and beard work by master barbers.</p>
        <div className="nx__ctas"><span className="nx__btn">Book a chair <i>→</i></span><span className="nx__btn nx__btn--ghost">View the menu</span></div>
      </div>
      <div className="nx__card"><div className="nx__ck"><i /><span>Open today</span></div><b>09:00 — 20:00</b></div>
    </div>
  );
}

/* ---------------- NeoApp · Sports Manager ---------------- */

function SportsMark() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <defs><linearGradient id="sp-n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFC93C" /><stop offset=".5" stopColor="#FF7A1A" /><stop offset="1" stopColor="#E0341B" /></linearGradient></defs>
      <path d="M14 54V14c0-3 3.5-4.3 5.5-2L44 42V12" stroke="url(#sp-n)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 52V22" stroke="url(#sp-n)" strokeWidth="5" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

function SportsLogin() {
  return (
    <div className="gx__card">
      <SportsMark />
      <b className="gx__brand">neo app</b>
      <small>Sports Manager App</small>
      <label>Email<i /></label>
      <label>Password<i /></label>
      <em>Setup password</em>
      <span className="gx__btn">Sign in</span>
    </div>
  );
}

export function SportsDesktop() {
  return (
    <div className="gx gx--desk">
      <span className="gx__bg" />
      <span className="gx__x gx__x--a" /><span className="gx__x gx__x--b" />
      <SportsLogin />
      <span className="gx__ver"><b>Powered By Neo app</b><i>VERSION 1.1</i></span>
    </div>
  );
}

export function SportsMobile() {
  return (
    <div className="gx gx--mob">
      <span className="gx__bg" />
      <span className="gx__x gx__x--a" /><span className="gx__x gx__x--b" />
      <SportsLogin />
      <span className="gx__ver"><b>Powered By Neo app</b><i>VERSION 1.1</i></span>
    </div>
  );
}

/* ---------------- NEO APP International ---------------- */

function NeoAppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="ix__hdr">
      <span className="ix__brand"><b>NEO APP</b><small>International</small></span>
      {compact ? <span className="ix__burger"><Ico name="menu" size={24} /></span> : <nav><span>Home</span><span>About</span><span>Products</span><span>Why Us</span><span>Contact</span></nav>}
    </header>
  );
}

export function NeoAppDesktop() {
  return (
    <div className="ix ix--desk">
      <span className="ix__stars" />
      <NeoAppHeader />
      <ParticleField shape="globe" className="ix__globe" width={640} height={640} />
      <div className="ix__copy">
        <h1>Building the Future of <span>Enterprise Technology</span></h1>
        <p>NEO APP INTERNATIONAL delivers premium, scalable applications for businesses worldwide. Transform your operations with cutting-edge technology solutions.</p>
        <div className="ix__btns"><span className="ix__btn">Explore Our Solutions</span><span className="ix__btn ix__btn--ghost">Get in Touch</span></div>
      </div>
    </div>
  );
}

export function NeoAppMobile() {
  return (
    <div className="ix ix--mob">
      <span className="ix__stars" />
      <NeoAppHeader compact />
      <ParticleField shape="globe" className="ix__globe" width={380} height={380} />
      <div className="ix__copy">
        <h1>Building the Future of <span>Enterprise Technology</span></h1>
        <p>Premium, scalable applications for businesses worldwide.</p>
        <div className="ix__btns"><span className="ix__btn">Explore Our Solutions</span><span className="ix__btn ix__btn--ghost">Get in Touch</span></div>
      </div>
    </div>
  );
}
