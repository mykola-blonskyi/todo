import type { Metadata, Viewport } from 'next';
import {
  Atkinson_Hyperlegible,
  Caveat,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Lora,
  Manrope,
  Nunito,
} from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/shared/ui/theme-provider';
import { QueryProvider } from '@/shared/ui/query-provider';
import { ServiceWorkerRegistration } from '@/shared/ui/service-worker-registration';
import { locales, type Locale } from '@shared/lib/i18n/config';
import { THEME_COLOR } from '@shared/lib/pwa';
import { getAppearance } from '@features/preferences/server';
import { PreferenceCookieSync, paletteClassName } from '@features/preferences';
import { getLayoutViews } from '@/layouts/registry';
import { fetchNavData } from '@/layouts/data';
import type { NavData } from '@/layouts/types';
import '../globals.css';

// One family per layout (see globals.css [data-layout=...]) plus Geist as the
// neutral base. next/font self-hosts them, so no runtime Google request; a
// family's files are only downloaded by browsers when its layout is active.
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
});
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'cyrillic'],
});
const lora = Lora({ variable: '--font-lora', subsets: ['latin', 'cyrillic'] });
const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin', 'cyrillic'],
});
const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'cyrillic'],
});
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
});
const atkinson = Atkinson_Hyperlegible({
  variable: '--font-atkinson',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const fontVariables = [
  geistSans,
  geistMono,
  plexSans,
  manrope,
  lora,
  caveat,
  nunito,
  plexMono,
  atkinson,
]
  .map((font) => font.variable)
  .join(' ');

export const metadata: Metadata = {
  title: 'todolist',
  description: 'Advanced TODO list at todo.blonskyi.dev',
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const [messages, appearance, headerList] = await Promise.all([
    getMessages(),
    getAppearance(),
    headers(),
  ]);

  // proxy.ts sets x-user-id only on gated pages, so it's absent on
  // /[locale]/login - exactly where there is no nav to load.
  let nav: NavData | null = null;
  if (headerList.get('x-user-id') !== null) {
    try {
      nav = await fetchNavData();
    } catch {
      // The shell must still render (with empty nav) if the backend hiccups;
      // the page itself surfaces the real error.
      nav = null;
    }
  }

  const { Shell } = getLayoutViews(appearance.layout);
  const paletteClass = paletteClassName(appearance.palette);

  return (
    <html
      lang={locale}
      data-layout={appearance.layout}
      className={`${fontVariables} ${paletteClass} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider mode={appearance.mode} owner={appearance.owner}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <QueryProvider>
              <Shell locale={locale} appearance={appearance} nav={nav}>
                {children}
              </Shell>
            </QueryProvider>
          </NextIntlClientProvider>
          {appearance.fromBackend ? (
            <PreferenceCookieSync
              palette={appearance.palette}
              layout={appearance.layout}
              owner={appearance.owner}
            />
          ) : null}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
