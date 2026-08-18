export const SITE_TIMEZONE = 'Europe/Paris';

/** Current UTC offset in whole hours for the site's timezone (1 in winter/CET, 2 in summer/CEST). */
export function siteOffsetHours(date: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUtc - date.getTime()) / 3600000);
}

/** Today's calendar date (YYYY-MM-DD) as seen from the site's timezone. */
export function siteToday(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** The UTC instant corresponding to 00:00:00 on `dateStr` in the site's timezone. */
export function siteMidnightUtc(dateStr: string, offsetHours = siteOffsetHours()): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, -offsetHours, 0, 0));
}
