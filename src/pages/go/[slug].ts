import type { APIRoute } from 'astro';
import { logEvent } from '../../lib/db';
import { isBotRequest } from '../../lib/bots';
import { isValidSessionCookieValue, SESSION_COOKIE } from '../../lib/auth';
import { resolveLocation } from '../../lib/geo';

const LINKS: Record<string, string> = {
  github: 'https://github.com/git-saidmansour',
  linkedin: 'https://linkedin.com/in/in-saidmansour',
};

export const GET: APIRoute = async ({ params, redirect, request, cookies }) => {
  const target = LINKS[params.slug ?? ''];
  if (!target) {
    return new Response('Not found', { status: 404 });
  }

  const isAdmin = isValidSessionCookieValue(cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin && !isBotRequest(request)) {
    logEvent('link_click', params.slug, resolveLocation(request));
  }

  return redirect(target, 302);
};
