import type { APIRoute } from 'astro';
import { savePushSubscription, deletePushSubscription } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { endpoint, keys } = body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return new Response(JSON.stringify({ error: 'invalid subscription' }), { status: 400 });
  }
  savePushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { endpoint } = body ?? {};
  if (endpoint) deletePushSubscription(endpoint);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
