import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, isValidSessionCookieValue } from './lib/auth';
import { isBotRequest } from './lib/bots';
import { logEvent } from './lib/db';
import { resolveLocation } from './lib/geo';

const VISITOR_COOKIE = 'visitor_id';
const VISITOR_SESSION_TTL = 30 * 60; // 30 minutes, sliding — standard "session" window

function resolveReferrer(request: Request): string {
  const referer = request.headers.get('referer');
  if (!referer) return 'direct';
  try {
    const host = new URL(referer).hostname.replace(/^www\./, '');
    // Same-origin navigation (e.g. an internal link) isn't an external source.
    return host === new URL(request.url).hostname.replace(/^www\./, '') ? 'direct' : host;
  } catch {
    return 'direct';
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const sessionCookie = context.cookies.get(SESSION_COOKIE)?.value;
  const isAdmin = isValidSessionCookieValue(sessionCookie);

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!isAdmin) {
      return context.redirect('/admin/login');
    }
  }

  if (pathname === '/' && context.request.method === 'GET') {
    if (!isAdmin && !isBotRequest(context.request)) {
      const existingVisitorId = context.cookies.get(VISITOR_COOKIE)?.value;
      const visitorId = existingVisitorId || crypto.randomUUID();

      if (!existingVisitorId) {
        logEvent('page_view', undefined, resolveLocation(context.request), resolveReferrer(context.request));
      }

      // Sliding expiry: a refresh (or continued browsing) within the window
      // doesn't count as a new visit, but 30+ min of inactivity does.
      context.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: VISITOR_SESSION_TTL,
      });
    }
  }

  const response = await next();

  if (pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
