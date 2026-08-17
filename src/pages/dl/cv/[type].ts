import type { APIRoute } from 'astro';
import { logEvent } from '../../../lib/db';
import { isBotRequest } from '../../../lib/bots';
import { isValidSessionCookieValue, SESSION_COOKIE } from '../../../lib/auth';
import { notifyCvDownload } from '../../../lib/push';

const CV_FILES: Record<string, string> = {
  'reseaux-cybersecurite': '/cv/matane-mansour-cv-reseaux-cybersecurite.pdf',
  'data-ia': '/cv/matane-mansour-cv-data-ia.pdf',
};

export const GET: APIRoute = async ({ params, redirect, request, cookies }) => {
  const type = params.type ?? '';
  const target = CV_FILES[type];
  if (!target) {
    return new Response('Not found', { status: 404 });
  }

  const isAdmin = isValidSessionCookieValue(cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin && !isBotRequest(request)) {
    logEvent('cv_download', type);
    notifyCvDownload(type).catch(() => {});
  }

  return redirect(target, 302);
};
