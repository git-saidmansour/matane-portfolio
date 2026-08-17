import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, isValidSessionCookieValue } from './lib/auth';
import { logEvent } from './lib/db';

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|curl|wget|python-requests|go-http-client|zgrab|headless|preview|monitor|uptime|pingdom|ahrefs|semrush|mj12/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = context.cookies.get(SESSION_COOKIE)?.value;
    if (!isValidSessionCookieValue(cookie)) {
      return context.redirect('/admin/login');
    }
  }

  if (pathname === '/' && context.request.method === 'GET') {
    const ua = context.request.headers.get('user-agent') || '';
    if (!BOT_UA_PATTERN.test(ua)) {
      logEvent('page_view');
    }
  }

  const response = await next();

  if (pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
});
