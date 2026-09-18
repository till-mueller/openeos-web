import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV === 'development';

// No security headers were set anywhere before this (no CSP, no
// X-Frame-Options, no HSTS, etc.). This is a pragmatic baseline, not a
// strict nonce-based CSP — 'unsafe-inline' on script/style is here because
// Next.js's App Router injects inline bootstrap scripts and styles that a
// strict CSP would break without wiring per-request nonces through
// middleware, which is a larger change than this pass covers. Even this
// still blocks the two things this audit flagged as missing outright:
// clickjacking (frame-ancestors) and MIME-sniffing (X-Content-Type-Options).
//
// connect-src is built at request time (headers() re-runs per request in
// standalone output, so process.env here reflects the container's actual
// runtime env, same as docker-entrypoint.sh's rewrite). https: covers the
// normal case (API/shop on their own HTTPS subdomains). In development the
// API is plain http on another port, which is neither 'self' nor https:,
// so it has to be allowed explicitly. Self-hosted production deployments
// that publish the API directly over plain HTTP too (e.g. Tailscale-only,
// no reverse-proxy TLS) need their exact origin allow-listed the same way —
// https: alone never matches an http:// fetch target.
function connectSrcOrigins(): string {
  if (isDev) {
    return "'self' https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*";
  }
  const extra = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_SHOP_URL]
    .filter((url): url is string => !!url && url.startsWith('http://'))
    .map((url) => new URL(url).origin);
  return ["'self'", 'https:', ...new Set(extra)].join(' ');
}

function buildSecurityHeaders() {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        `connect-src ${connectSrcOrigins()}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; '),
    },
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
