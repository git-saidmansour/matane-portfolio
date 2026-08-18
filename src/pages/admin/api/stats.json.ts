import type { APIRoute } from 'astro';
import { getStats, type PeriodType } from '../../../lib/db';

const VALID_TYPES: PeriodType[] = ['day', 'week', 'month'];

export const GET: APIRoute = ({ url }) => {
  const typeParam = url.searchParams.get('period');
  const dateParam = url.searchParams.get('date') || undefined;
  const type: PeriodType = VALID_TYPES.includes(typeParam as PeriodType)
    ? (typeParam as PeriodType)
    : 'day';

  return new Response(JSON.stringify(getStats(type, dateParam)), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
