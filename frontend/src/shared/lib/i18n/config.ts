export const locales = ['en', 'ru', 'uk', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// next-intl's middleware owns this cookie; this app only reads and clears it.
export const LOCALE_COOKIE = 'NEXT_LOCALE';

// Anything that reaches a URL path segment goes through here first. NEXT_LOCALE
// is a plain cookie any `.blonskyi.dev` host can set, and a value of
// "/evil.com" turned `new URL('/' + locale + '/login', APP_URL)` into a
// protocol-relative URL pointing off-origin.
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' && (locales as readonly string[]).includes(value)
  );
}

export function parseLocale(value: unknown): Locale | null {
  return isLocale(value) ? value : null;
}
