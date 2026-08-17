import type { APIRoute } from 'astro';
import { logEvent } from '../../../lib/db';

const CV_FILES: Record<string, string> = {
  'reseaux-cybersecurite': '/cv/matane-mansour-cv-reseaux-cybersecurite.pdf',
  'data-ia': '/cv/matane-mansour-cv-data-ia.pdf',
};

export const GET: APIRoute = ({ params, redirect }) => {
  const type = params.type ?? '';
  const target = CV_FILES[type];
  if (!target) {
    return new Response('Not found', { status: 404 });
  }
  logEvent('cv_download', type);
  return redirect(target, 302);
};
