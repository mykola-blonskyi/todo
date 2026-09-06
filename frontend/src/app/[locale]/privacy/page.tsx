import { getTranslations } from 'next-intl/server';
import { Link } from '@shared/lib/i18n/navigation';

// Deliberately not part of the src/layouts/* system (ADR-017): this is a
// single static legal document, not a screen that needs a board/notebook/
// terminal variant. It still renders inside the active layout's Shell (see
// [locale]/layout.tsx), so nav/theme/palette stay consistent - only the page
// content itself skips per-layout treatment.
//
// Reachable without signing in (see the PUBLIC_PATH_PATTERN exemption in
// proxy.ts) because Google's OAuth consent screen links here for the
// `calendar.events` scope, and Google's review has to be able to load it
// while logged out.
const CONTACT_EMAIL = 'nikolay.blonskiy@gmail.com';
const REVOKE_URL = 'https://myaccount.google.com/permissions';

const SECTION_KEYS = [
  ['accessTitle', 'accessBody'],
  ['purposeTitle', 'purposeBody'],
  ['storageTitle', 'storageBody'],
  ['retentionTitle', 'retentionBody'],
] as const;

export default async function PrivacyPage() {
  const t = await getTranslations('Privacy');

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('lastUpdated')}</p>
      <p className="mt-6 text-sm leading-relaxed">{t('intro')}</p>

      {SECTION_KEYS.map(([titleKey, bodyKey]) => (
        <section key={titleKey} className="mt-6">
          <h2 className="text-base font-semibold">{t(titleKey)}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(bodyKey)}
          </p>
        </section>
      ))}

      <section className="mt-6">
        <h2 className="text-base font-semibold">{t('revokeTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('revokeBody')}
        </p>
        <a
          href={REVOKE_URL}
          className="mt-1 inline-block text-sm underline underline-offset-4"
        >
          {REVOKE_URL}
        </a>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">{t('sharingTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('sharingBody')}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">{t('changesTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('changesBody')}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">{t('contactTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('contactBody')}
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-1 inline-block text-sm underline underline-offset-4"
        >
          {CONTACT_EMAIL}
        </a>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/settings" className="underline underline-offset-4">
          {t('backToSettings')}
        </Link>
      </p>
    </div>
  );
}
