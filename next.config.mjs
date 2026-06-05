import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained build for the Docker runtime image (.next/standalone).
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    // Prisma + firebase-admin are server-only; keep them external to the bundle.
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'firebase-admin'],
  },
};

export default withNextIntl(nextConfig);
