"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getDict, type Locale } from "@/lib/i18n";
import { onQuoteOpen } from "@/lib/quote";
import { sendContact } from "@/lib/actions";
import { ConsentCheck } from "./ConsentCheck";
import { type ServiceIcon } from "@/lib/content";
import { ArrowLeft, ArrowUpRight, BoltIcon, Check, ServiceGlyph } from "./icons";
import { LogoLoader } from "./LogoLoader";
import { WhatsAppLink } from "./WhatsAppLink";

const NEED_ICONS: ServiceIcon[] = ["mobile", "web", "ai", "integration", "design", "search"];
const STEPS = 4;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s().-]{7,20}$/;
const ease = [0.22, 1, 0.36, 1] as const;

// small outline icons for the stage and timeline answers (lucide)
const STAGE_ICONS = [
  "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z",
  "M12 20h9M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  "M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1ZM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2Z",
];
const TIME_ICONS = [
  "M13 2 3 14h9l-1 8 10-12h-9l1-8Z",
  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3Z",
];
const Glyph = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

/**
 * The quote quiz: four quick steps (what, where you are, when, who) and it sends the request
 * itself, with the logo loader while it goes and a clear "sent" at the end. Opened by any QuoteButton.
 */
export function QuoteQuiz({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const q = dict.quote;
  const f = dict.contact.form;
  const reduce = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [needs, setNeeds] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [timeline, setTimeline] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<"ask" | "sending" | "sent" | "failed">("ask");
  const [replyBy, setReplyBy] = useState<number | null>(null);
  const [failKey, setFailKey] = useState<"errSend" | "errRate">("errSend");
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(
    () =>
      onQuoteOpen((preset) => {
        lastFocus.current = document.activeElement as HTMLElement | null;
        // a fresh quiz after a sent request; otherwise pick up where the visitor left it
        setPhase((ph) => {
          if (ph === "sent") {
            setNeeds([]); setStage(""); setTimeline(""); setName(""); setEmail(""); setPhone(""); setConsent(false);
          }
          return "ask";
        });
        // opened from a specific need: that one comes ticked
        if (preset.length) setNeeds(preset);
        setStep(0);
        setTouched(false);
        setOpen(true);
      }),
    []
  );

  // while open: no page scroll, Escape closes, Tab stays inside the dialog
  useEffect(() => {
    if (!open) return;
    window.__lenis?.stop();
    // lock on <body>: an overflow on <html> would turn <body> into the scroller and unpin the sticky sections behind
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "sending") close();
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), input");
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = prev;
      window.__lenis?.start();
      lastFocus.current?.focus?.();
    };
  }, [open, close, phase]);

  // focus the first answer of each step
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => panel.current?.querySelector<HTMLElement>(".quiz__body button, .quiz__body input")?.focus(), 80);
    return () => clearTimeout(id);
  }, [open, step]);

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  // single answers move on by themselves, after a beat so the choice is seen
  const pickAndNext = (set: (v: string) => void, v: string) => {
    set(v);
    setTimeout(() => go(step + 1), reduce ? 0 : 260);
  };

  const validName = name.trim().length > 0;
  const validEmail = emailRe.test(email.trim());
  const validPhone = !phone.trim() || phoneRe.test(phone.trim());
  const canNext = [needs.length > 0, !!stage, !!timeline, validName && validEmail && validPhone && consent][step];

  const finish = async () => {
    setTouched(true);
    if (!validName || !validEmail || !validPhone || !consent) return;
    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("name", name.trim());
    fd.set("email", email.trim());
    fd.set("phone", phone.trim());
    fd.set("timeline", timeline);
    fd.set("consent", "yes");
    needs.forEach((n) => fd.append("needs", n));
    fd.set("message", [`${q.msgWant}: ${needs.join(", ")}.`, `${q.msgStage}: ${stage}.`, `${q.msgTimeline}: ${timeline}.`].join("\n"));
    setPhase("sending");
    try {
      // the loader stays long enough to be read as a step, not a flicker
      const [res] = await Promise.all([sendContact({ status: "idle" }, fd), new Promise((r) => setTimeout(r, reduce ? 0 : 1100))]);
      if (res.status === "success") {
        setReplyBy(res.replyBy ?? null);
        setPhase("sent");
      } else {
        setFailKey(res.errorKey ?? "errSend");
        setPhase(res.fieldErrors ? "ask" : "failed");
      }
    } catch {
      setFailKey("errSend");
      setPhase("failed");
    }
  };

  const steps = [
    {
      title: q.q1, hint: q.q1Hint,
      body: (
        <div className="quiz__grid">
          {f.needOptions.map((o, i) => {
            const on = needs.includes(o);
            return (
              <button key={o} type="button" role="checkbox" aria-checked={on} className={`quiz__opt${on ? " is-on" : ""}`}
                onClick={() => setNeeds((v) => (on ? v.filter((x) => x !== o) : [...v, o]))}>
                <span className="quiz__ico"><ServiceGlyph name={NEED_ICONS[i]} /></span>
                <span className="quiz__txt"><b>{o}</b><small>{q.needDescs[i]}</small></span>
                <span className="quiz__tick" aria-hidden="true"><Check size={13} /></span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: q.q2,
      body: (
        <div className="quiz__list" role="radiogroup" aria-label={q.q2}>
          {q.stages.map((o, i) => (
            <button key={o} type="button" role="radio" aria-checked={stage === o} className={`quiz__opt${stage === o ? " is-on" : ""}`} onClick={() => pickAndNext(setStage, o)}>
              <span className="quiz__ico"><Glyph d={STAGE_ICONS[i]} /></span>
              <span className="quiz__txt"><b>{o}</b></span>
              <span className="quiz__tick" aria-hidden="true"><Check size={13} /></span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: q.q3,
      body: (
        <div className="quiz__list" role="radiogroup" aria-label={q.q3}>
          {f.timelines.map((o, i) => (
            <button key={o} type="button" role="radio" aria-checked={timeline === o} className={`quiz__opt${timeline === o ? " is-on" : ""}`} onClick={() => pickAndNext(setTimeline, o)}>
              <span className="quiz__ico"><Glyph d={TIME_ICONS[i]} /></span>
              <span className="quiz__txt"><b>{o}</b></span>
              <span className="quiz__tick" aria-hidden="true"><Check size={13} /></span>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: q.q4, hint: q.q4Hint,
      body: (
        <form className="quiz__form" onSubmit={(e) => { e.preventDefault(); finish(); }} noValidate>
          <label className="quiz__field">
            <span>{f.name}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={f.namePh} autoComplete="name" aria-invalid={touched && !validName} />
            {touched && !validName && <em role="alert">{f.errName}</em>}
          </label>
          <label className="quiz__field">
            <span>{f.email}</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={f.emailPh} type="email" inputMode="email" autoComplete="email" aria-invalid={touched && !validEmail} />
            {touched && !validEmail && <em role="alert">{f.errEmail}</em>}
          </label>
          <label className="quiz__field">
            <span>{f.phone} <i>{f.phoneOpt}</i></span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={f.phonePh} type="tel" inputMode="tel" autoComplete="tel" aria-invalid={touched && !validPhone} />
            {touched && !validPhone ? <em role="alert">{f.errPhone}</em> : <small>{f.phoneHint}</small>}
          </label>
          <ConsentCheck id="quiz-consent" locale={locale} checked={consent} onChange={setConsent} error={touched && !consent} />
          {phase === "failed" && <p className="quiz__fail" role="alert">{f[failKey]}</p>}
          <button type="submit" hidden />
        </form>
      ),
    },
  ];
  const s = steps[step];
  const asking = phase === "ask" || phase === "failed";
  const by = replyBy
    ? new Date(replyBy).toLocaleString(locale === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <div className="quiz__scrim" onClick={() => phase !== "sending" && close()} aria-hidden="true" />
          <motion.div
            ref={panel}
            className="quiz__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-title"
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.45, ease }}
          >
            <header className="quiz__head">
              <span className="quiz__badge"><BoltIcon size={13} /><span className="quiz__badge-text">{q.title}</span></span>
              {asking && <span className="quiz__count">{q.step} {step + 1} {q.of} {STEPS}</span>}
              <button type="button" className="quiz__close" onClick={close} aria-label={q.close} disabled={phase === "sending"}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </header>
            {asking ? (
            <>
            <div className="quiz__bar" aria-hidden="true">
              {Array.from({ length: STEPS }, (_, i) => <i key={i} className={i <= step ? "is-on" : ""} />)}
            </div>

            <div className="quiz__stage" data-lenis-prevent>
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={step}
                  className="quiz__step"
                  custom={dir}
                  initial={reduce ? false : { opacity: 0, x: dir * 36 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -36 }}
                  transition={{ duration: 0.32, ease }}
                >
                  <h2 id="quiz-title" className="quiz__title">{s.title}</h2>
                  {s.hint && <p className="quiz__hint">{s.hint}</p>}
                  <div className="quiz__body">{s.body}</div>
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="quiz__foot">
              {step > 0 ? (
                <button type="button" className="quiz__back" onClick={() => go(step - 1)}><ArrowLeft />{q.back}</button>
              ) : (
                <span className="quiz__promise"><i />{q.promise}</span>
              )}
              {step < STEPS - 1 ? (
                <button type="button" className="btn" disabled={!canNext} onClick={() => go(step + 1)}>{q.next} <ArrowUpRight /></button>
              ) : (
                <button type="button" className="btn" onClick={finish}>{q.finish} <ArrowUpRight /></button>
              )}
            </footer>
            </>
            ) : (
              <motion.div className="quiz__status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
                {phase === "sending" ? (
                  <>
                    <LogoLoader size={112} />
                    <p id="quiz-title" className="quiz__status-text">{q.sending}</p>
                  </>
                ) : (
                  <>
                    <span className="quiz__ok" aria-hidden="true">
                      <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" /><path d="M15.5 27l7 7 14-15" /></svg>
                    </span>
                    <h2 id="quiz-title" className="quiz__title">{q.successTitle}</h2>
                    {by && <p className="quiz__hint">{q.successText} <b>{by}</b>.</p>}
                    <div className="quiz__done">
                      <button type="button" className="btn" onClick={close}>{q.done}</button>
                      <WhatsAppLink className="btn btn--ghost">{f.urgent} <ArrowUpRight /></WhatsAppLink>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
