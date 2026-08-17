import type { APIRoute } from 'astro';
import { getStats } from '../../../lib/db';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(getStats()), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
