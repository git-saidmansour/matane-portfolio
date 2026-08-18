import geoip from 'geoip-lite';
import { getClientIp } from './ip';

export interface GeoInfo {
  countryCode: string | null;
  country: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' });

const EMPTY_GEO: GeoInfo = { countryCode: null, country: null, city: null, lat: null, lon: null };

export function resolveLocation(request: Request): GeoInfo {
  const ip = getClientIp(request);
  if (!ip || ip === 'unknown') return EMPTY_GEO;

  const geo = geoip.lookup(ip);
  if (!geo) return EMPTY_GEO;

  let countryName: string | null = null;
  try {
    countryName = geo.country ? countryNames.of(geo.country) ?? geo.country : null;
  } catch {
    countryName = geo.country || null;
  }

  return {
    countryCode: geo.country || null,
    country: countryName,
    city: geo.city || null,
    lat: geo.ll?.[0] ?? null,
    lon: geo.ll?.[1] ?? null,
  };
}
