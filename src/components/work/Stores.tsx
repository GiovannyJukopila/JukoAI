import type { Platform, Store } from "@/lib/content";
import { getDict, type Locale } from "@/lib/i18n";
import { AppleIcon, PlayIcon, PlatformIcon } from "../icons";

export function StoreBadge({ store, locale, name, compact = false }: { store: Store; locale: Locale; name?: string; compact?: boolean }) {
  const s = getDict(locale).work.store;
  const ios = store.type === "iOS";
  const label = ios ? s.ios : s.android;
  return (
    <a
      href={store.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`store-badge${compact ? " store-badge--compact" : ""}`}
      aria-label={`${name ? name + " · " : ""}${label}`}
    >
      {ios ? <AppleIcon size={compact ? 14 : 20} /> : <PlayIcon size={compact ? 13 : 18} />}
      {compact ? (
        <b>{label}</b>
      ) : (
        <span>
          <small>{ios ? s.iosPre : s.androidPre}</small>
          <b>{label}</b>
        </span>
      )}
    </a>
  );
}

export function PlatformList({ platforms }: { platforms: Platform[] }) {
  return (
    <ul className="platforms" aria-label="Platforms">
      {platforms.map((p) => (
        <li key={p}><PlatformIcon platform={p} size={12} /> {p}</li>
      ))}
    </ul>
  );
}
