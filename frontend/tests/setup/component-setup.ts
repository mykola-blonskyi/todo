import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => {
  cleanup();
});

// next-intl's Link (createNavigation) reads next/navigation's useRouter/
// usePathname, which need a real Next.js App Router context jsdom/RTL
// doesn't provide. It's a third-party integration, not our logic - stand in
// a plain <a>, same as skipping tests for other wrapped primitives.
vi.mock('@shared/lib/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', { href, ...props }, children),
}));
