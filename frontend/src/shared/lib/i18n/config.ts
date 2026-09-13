export const locales = ['en', 'ru', 'uk', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// next-intl's middleware owns this cookie; this app only reads and clears it.
export const LOCALE_COOKIE = 'NEXT_LOCALE';
