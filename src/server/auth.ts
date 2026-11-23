import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { readDb } from './db';

export const ADMIN_COOKIE = 'boaz_admin';
export const SESSION_MS = 1000 * 60 * 60 * 24 * 7;

/** Default passcode is `boaz2026`. Override with the ADMIN_PASSCODE environment variable. */
export function passcode(): string {
  return process.env.ADMIN_PASSCODE?.trim() || 'boaz2026';
}

export function checkPasscode(input: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(passcode()).digest();
  return crypto.timingSafeEqual(a, b);
}

// Changing the passcode also invalidates existing sessions, because it is part of the signing key.
const key = (secret: string) => `${secret}:${passcode()}`;

export function signSession(secret: string): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', key(secret)).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(secret: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', key(secret)).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: number };
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

const g = globalThis as unknown as { __boazSecret?: string };

/** The signing secret lives in the data store; keep it in memory so checking a session never costs a storage read. */
export async function sessionSecret(fresh = false): Promise<string> {
  if (!fresh && g.__boazSecret) return g.__boazSecret;
  const db = await readDb(fresh ? 0 : undefined);
  g.__boazSecret = db.secret;
  return db.secret;
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  if (verifySession(await sessionSecret(), token)) return true;
  // The data may have been reset since this instance cached the secret: check once against the stored one.
  return verifySession(await sessionSecret(true), token);
}
