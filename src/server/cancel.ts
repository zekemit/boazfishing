import crypto from 'node:crypto';
import type { Booking } from '@/lib/types';
import { localToUtc } from './clock';
import { readDb } from './db';
import { sessionSecret } from './auth';

/** Students can cancel themselves up to this many hours before the lesson starts. */
export const CANCEL_NOTICE_HOURS = 24;

/**
 * The cancel link carries a signature of the booking id, made with the server's secret. No extra data is
 * stored, so it works for every booking (old ones too), and it can't be guessed or edited.
 */
export async function cancelToken(id: string): Promise<string> {
  return crypto.createHmac('sha256', await sessionSecret()).update(`cancel:${id}`).digest('base64url').slice(0, 32);
}

export async function cancelPath(b: Booking): Promise<string> {
  return `/cancel?code=${encodeURIComponent(b.code)}&t=${await cancelToken(b.id)}`;
}

/** The booking that this code and token point at, or null if either is wrong. */
export async function findForCancel(code: string, token: string): Promise<Booking | null> {
  const db = await readDb(0);
  const b = db.bookings.find((x) => x.code === code.toUpperCase());
  if (!b) return null;
  const want = Buffer.from(await cancelToken(b.id));
  const got = Buffer.from(token);
  return want.length === got.length && crypto.timingSafeEqual(want, got) ? b : null;
}

export const hoursUntilStart = (b: Booking): number => (localToUtc(b.date, b.start).getTime() - Date.now()) / 3_600_000;
