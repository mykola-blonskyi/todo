import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/shared/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone', // required for the lean multi-stage Docker build (Phase 7)
};

export default withNextIntl(nextConfig);
