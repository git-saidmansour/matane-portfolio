import type { APIRoute } from 'astro';
import { getVisitorsByCountry } from '../../../lib/db';

export const GET: APIRoute = ({ url }) => {
  const code = url.searchParams.get('code');
  const visitors = code ? getVisitorsByCountry(code) : [];

  return new Response(JSON.stringify(visitors), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
