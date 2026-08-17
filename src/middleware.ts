import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, isValidSessionCookieValue } from './lib/auth';
import { isBotRequest } from './lib/bots';
import { logEvent } from './lib/db';

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
      logEvent('page_view');
    }
  }

  const response = await next();

  if (pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
