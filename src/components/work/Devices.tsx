import type { ReactNode } from "react";
import { Scaled } from "./Scaled";

/* Device chrome around screens that are built in code, not screenshots. */

export const DESKTOP = { w: 1440, h: 900 };
export const PHONE = { w: 390, h: 844 };

export function BrowserFrame({ domain, children, className = "" }: { domain?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`browser-frame ${className}`}>
      <div className="browser-frame__bar" aria-hidden="true">
        <span className="browser-frame__dots"><i /><i /><i /></span>
        {domain && (
          <span className="browser-frame__url">
            <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor"><path d="M4 7V5a4 4 0 118 0v2h1v8H3V7h1zm2 0h4V5a2 2 0 10-4 0v2z" /></svg>
            {domain}
          </span>
        )}
      </div>
      <Scaled w={DESKTOP.w} h={DESKTOP.h} className="browser-frame__screen">{children}</Scaled>
    </div>
  );
}

export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`phone-frame ${className}`}>
      <div className="phone-frame__screen">
        <Scaled w={PHONE.w} h={PHONE.h}>{children}</Scaled>
        <span className="phone-frame__island" aria-hidden="true" />
      </div>
    </div>
  );
}
