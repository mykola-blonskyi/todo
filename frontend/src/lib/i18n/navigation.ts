import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware wrappers around Next.js' navigation APIs - use these instead
// of next/link and next/navigation for any link to an internal page.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
