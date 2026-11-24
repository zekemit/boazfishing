import crypto from 'node:crypto';
import type { Booking } from '@/lib/types';
import { localToUtc } from './clock';
import { readDb } from './db';
import { sessionSecret } from './auth';

/** Students can cancel themselves up to this many hours before their next session starts. */
export const CANCEL_NOTICE_HOURS = 24;

/**
 * The cancel link carries a signature of the booking's confirmation code, made with the server's secret. All three
 * sessions of a program share that code, so one link manages the whole program. Nothing extra is stored, and the
 * link can't be guessed or edited.
 */
export async function cancelToken(code: string): Promise<string> {
  return crypto.createHmac('sha256', await sessionSecret()).update(`cancel:${code.toUpperCase()}`).digest('base64url').slice(0, 32);
}

export async function cancelPath(b: Pick<Booking, 'code'>): Promise<string> {
  return `/cancel?code=${encodeURIComponent(b.code)}&t=${await cancelToken(b.code)}`;
}

/** Every session of the booking that this code and token point at (sorted), or [] if either is wrong. */
export async function findForCancel(code: string, token: string): Promise<Booking[]> {
  const want = Buffer.from(await cancelToken(code));
  const got = Buffer.from(token);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return [];
  const db = await readDb(0);
  return db.bookings.filter((x) => x.code === code.toUpperCase()).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

export const startMs = (b: Booking): number => localToUtc(b.date, b.start).getTime();
export const hoursUntilStart = (b: Booking): number => (startMs(b) - Date.now()) / 3_600_000;

/** Sessions a student can still cancel: not done, not already cancelled, and not yet started. */
export const cancellable = (list: Booking[]): Booking[] => list.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && startMs(b) > Date.now());
