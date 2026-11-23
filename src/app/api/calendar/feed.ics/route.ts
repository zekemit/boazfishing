import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { buildFeed } from '@/server/calendar';
import { readDb } from '@/server/db';
import { siteUrl } from '@/server/notify/config';

export const dynamic = 'force-dynamic';

/**
 * Subscribable calendar feed (Apple Calendar, Google Calendar, Outlook). Calendar apps can't sign in, so the
 * link carries a long private token instead. Rotate it from Admin if it ever leaks.
 */
export async function GET(req: NextRequest) {
  const db = await readDb(30_000);
  const given = req.nextUrl.searchParams.get('token') ?? '';
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(db.calendarToken).digest();
  if (!given || !crypto.timingSafeEqual(a, b)) return new Response('Not found', { status: 404 });
  const base = siteUrl();
  const ics = buildFeed(db.bookings, new URL(base).host, `${base}/admin`);
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="boaz-fishing-lessons.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
