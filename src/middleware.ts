import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from '@/core/i18n/config';

const intlMiddleware = createMiddleware(routing);

const UTM_COOKIE = 'utm_source';
const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export default function middleware(request: NextRequest) {
  if (
    /^\/zh\/(about|privacy-policy|terms-of-service|refund-policy)(?:\/|$)/.test(
      request.nextUrl.pathname
    )
  )
    return NextResponse.redirect(
      new URL(request.nextUrl.pathname.replace(/^\/zh/, ''), request.url)
    );
  const response = intlMiddleware(request);

  // First-touch attribution: persist the earliest utm_source so the signup
  // hook (src/core/auth) can stamp it onto the user record.
  const utmSource = request.nextUrl.searchParams.get('utm_source');
  if (utmSource && !request.cookies.get(UTM_COOKIE)) {
    const sanitized = utmSource.replace(/[^\w.\-]/g, '').slice(0, 100);
    if (sanitized) {
      response.cookies.set(UTM_COOKIE, sanitized, {
        maxAge: UTM_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
      });
    }
  }

  if (
    /^\/(?:en\/|zh\/)?(?:dashboard|settings|admin|sign-in|sign-up|blog|forgot-password|reset-password|verify-email|redeem-invite)(?:\/|$)/.test(
      request.nextUrl.pathname
    )
  )
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except API routes, static files, etc.
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
