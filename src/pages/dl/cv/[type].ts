import type { APIRoute } from 'astro';
import { getCvBySlug, logEvent } from '../../../lib/db';
import { isBotRequest } from '../../../lib/bots';
import { isValidSessionCookieValue, SESSION_COOKIE } from '../../../lib/auth';
import { notifyCvDownload } from '../../../lib/push';

export const GET: APIRoute = async ({ params, redirect, request, cookies }) => {
  const cv = getCvBySlug(params.type ?? '');
  if (!cv) {
    return new Response('Not found', { status: 404 });
  }

  const isAdmin = isValidSessionCookieValue(cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin && !isBotRequest(request)) {
    logEvent('cv_download', cv.slug);
    notifyCvDownload(cv.slug).catch(() => {});
  }

  return redirect(cv.file_path, 302);
};
