import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// No security headers were set anywhere before this (no CSP, no
// X-Frame-Options, no HSTS, etc.). This is a pragmatic baseline, not a
// strict nonce-based CSP — 'unsafe-inline' on script/style is here because
// Next.js's App Router injects inline bootstrap scripts and styles that a
// strict CSP would break without wiring per-request nonces through
// middleware, which is a larger change than this pass covers. Even this
// still blocks the two things this audit flagged as missing outright:
// clickjacking (frame-ancestors) and MIME-sniffing (X-Content-Type-Options).
//
// Content-Security-Policy is deliberately NOT set here: next.config.ts's
// headers() is resolved once at `next build` time into a static
// .next/routes-manifest.json entry, not re-invoked per request — so
// process.env.NEXT_PUBLIC_API_URL here would see whatever CI's build-time
// placeholder/sentinel was, never the container's actual runtime value
// (that value only exists after docker-entrypoint.sh's post-build rewrite).
// connect-src needs the real runtime origin, so it's set in middleware.ts
// instead, which genuinely re-runs per request. Keeping it here too would
// also be wrong even with a correct value: multiple CSP headers intersect
// (logical AND) rather than merge, so a stale build-time header would
// silently re-narrow whatever middleware sets.
function buildSecurityHeaders() {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}

const nextConfig: NextConfig = {
  output: 'standalone',
  // @openeos/ui liefert das Font-Modul als TypeScript-Quelle aus:
  // next/font-Aufrufe müssen als const im Quelltext ankommen, ein
  // gebündeltes dist würde daraus var machen und das Font-Plugin
  // von Next bricht ab.
  transpilePackages: ['@openeos/ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

// Sentry config (only in production)
const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

const configWithIntl = withNextIntl(nextConfig);

export default process.env.SENTRY_DSN
  ? withSentryConfig(configWithIntl, sentryConfig)
  : configWithIntl;
