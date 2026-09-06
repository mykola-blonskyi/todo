import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => {
  cleanup();
});

// jsdom has no ResizeObserver - Radix's Select (useSize, for content sizing)
// needs one to even mount, unrelated to anything under test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

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
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
  getPathname: () => '/',
}));

// Same reasoning as the i18n Link mock above, for client components (e.g.
// CategoryFilter) that read/write the URL directly via next/navigation
// instead of going through the i18n wrapper.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));
