import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/server/auth';
import { fail, guarded, json } from '@/server/http';
import { env } from '@/server/notify/config';
import { runReminders } from '@/server/notify/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function cronAuthorized(req: NextRequest): boolean {
  const secret = env('CRON_SECRET');
  if (!secret) return false;
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.nextUrl.searchParams.get('key') ?? '';
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Triggers the scheduled notifications: day-before reminders to students and the morning agenda to Boaz.
 * Safe to call repeatedly (each reminder is claimed before sending, so nothing is sent twice).
 * Callers: Vercel Cron (sends `Authorization: Bearer $CRON_SECRET`), any free pinger using ?key=, or the admin button.
 */
async function handle(req: NextRequest) {
  return guarded(async () => {
    if (!(cronAuthorized(req) || (await isAdmin()))) return fail(401, 'Not authorized to run reminders.');
    return json(await runReminders());
  });
}

export const GET = handle;
export const POST = handle;
