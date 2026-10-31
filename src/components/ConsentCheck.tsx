"use client";

import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import { LEGAL_PATH } from "@/lib/legal";
import { Check } from "./icons";

/*
 * The data-processing authorisation (Ley 1581): unticked by default and required to send.
 * The policy opens in a new tab so the request being filled in is never lost.
 */
export function ConsentCheck({ id, locale, checked, onChange, error }: {
  id: string; locale: Locale; checked: boolean; onChange: (v: boolean) => void; error?: boolean;
}) {
  const f = getDict(locale).contact.form;
  return (
    <div className={`consent${error ? " is-error" : ""}`}>
      <label className="consent__row" htmlFor={id}>
        <input id={id} type="checkbox" name="consent" value="yes" checked={checked} onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error || undefined} aria-describedby={error ? `${id}-err` : undefined} required />
        <span className="consent__box" aria-hidden="true"><Check size={12} /></span>
        <span className="consent__txt">
          {f.consent}{" "}
          <Link href={`/${locale}${LEGAL_PATH.privacy}`} target="_blank" rel="noopener">{f.consentLink}</Link>.
        </span>
      </label>
      {error && <span id={`${id}-err`} className="consent__err" role="alert">{f.errConsent}</span>}
    </div>
  );
}
