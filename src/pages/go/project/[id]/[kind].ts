import type { APIRoute } from 'astro';
import { getProject, logEvent } from '../../../../lib/db';
import { isBotRequest } from '../../../../lib/bots';
import { isValidSessionCookieValue, SESSION_COOKIE } from '../../../../lib/auth';
import { resolveLocation } from '../../../../lib/geo';

export const GET: APIRoute = async ({ params, redirect, request, cookies }) => {
  const id = Number(params.id);
  const kind = params.kind;
  if (!Number.isInteger(id) || (kind !== 'repo' && kind !== 'demo')) {
    return new Response('Not found', { status: 404 });
  }

  const project = getProject(id);
  const target = kind === 'repo' ? project?.repo_url : project?.live_url;
  if (!project || !target) {
    return new Response('Not found', { status: 404 });
  }

  const isAdmin = isValidSessionCookieValue(cookies.get(SESSION_COOKIE)?.value);
  if (!isAdmin && !isBotRequest(request)) {
    logEvent('link_click', `project:${id}:${kind}`, resolveLocation(request));
  }

  return redirect(target, 302);
};
