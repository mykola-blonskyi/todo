import { redirect } from 'next/navigation';
import { defaultLocale } from '@shared/lib/i18n/config';

// Unreachable in normal operation - middleware redirects every unprefixed
// request into a locale first. Exists only because Next.js requires some
// page at the root, same as the hub's own ADR-020 note.
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
