import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const isDev = process.env.NODE_ENV === 'development';

// connect-src has to be computed here, not in next.config.ts's headers()
// (that resolves once at `next build` time into a static manifest — see
// the comment there). Middleware genuinely re-runs per request in the
// running container, so process.env reflects the actual runtime env
// (same NEXT_PUBLIC_API_URL docker-entrypoint.sh rewrites the client
// bundle from). https: covers the normal case (API/shop on their own
// HTTPS subdomains). Self-hosted deployments that publish the API
// directly over plain HTTP (e.g. Tailscale-only, no reverse-proxy TLS)
// need their exact origin allow-listed too — https: alone never matches
// an http:// fetch target.
function connectSrcOrigins(): string {
  if (isDev) {
    return "'self' https: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*";
  }
  const extra = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_SHOP_URL]
    .filter((url): url is string => !!url && url.startsWith('http://'))
    .map((url) => new URL(url).origin);
  return ["'self'", 'https:', ...new Set(extra)].join(' ');
}

function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrcOrigins()}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = await intlMiddleware(request);
  response.headers.set('Content-Security-Policy', contentSecurityPolicy());
  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - Next.js internal routes
    // - Static files
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
