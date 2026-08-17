import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, 64);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
}

export function createSessionCookieValue(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ expires })).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function isValidSessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const [payload, sig] = value.split('.');
  if (!payload || !sig) return false;
  const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { expires } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof expires === 'number' && Date.now() < expires;
  } catch {
    return false;
  }
}

export { SESSION_COOKIE, SESSION_TTL_MS };

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export function isRateLimited(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(ip: string): void {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(ip: string): void {
  loginAttempts.delete(ip);
}
