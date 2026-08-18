import type { APIRoute } from 'astro';
import { getCvBySlug, logEvent } from '../../../lib/db';
import { isBotRequest } from '../../../lib/bots';
import { isValidSessionCookieValue, SESSION_COOKIE } from '../../../lib/auth';
import { notifyCvDownload } from '../../../lib/push';
import { resolveLocation } from '../../../lib/geo';

export const GET: APIRoute = async ({ params, redirect, request, cookies, locals }) => {
  const cv = getCvBySlug(params.type ?? '');
  if (!cv) {
    return new Response('Not found', { status: 404 });
  }

  const isAdmin = isValidSessionCookieValue(cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin && !isBotRequest(request)) {
    logEvent('cv_download', { meta: cv.slug, geo: resolveLocation(request), visitorUid: locals.vuid });
    notifyCvDownload(cv.slug).catch(() => {});
  }

  return redirect(cv.file_path, 302);
};
