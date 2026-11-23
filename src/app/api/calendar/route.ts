import type { NextRequest } from 'next/server';
import { mutate, readDb } from '@/server/db';
import { fail, guardAdmin, guarded, json, readJson } from '@/server/http';
import { siteUrl } from '@/server/notify/config';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

function origin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
  return host ? `${proto}://${host}` : siteUrl();
}

const urls = (base: string, token: string) => {
  const https = `${base}/api/calendar/feed.ics?token=${token}`;
  return { feedUrl: https, webcalUrl: https.replace(/^https?:/, 'webcal:') };
};

/** Admin: the private subscription link for the calendar feed. */
export async function GET(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const db = await readDb(3000);
    return json(urls(origin(req), db.calendarToken));
  });
}

/** Admin: { action: 'rotate' } issues a new link and kills the old one (use if the link was ever shared by mistake). */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const body = (await readJson(req)) as { action?: string } | undefined;
    if (body?.action !== 'rotate') return fail(400, 'Unknown action.');
    const token = await mutate((db) => (db.calendarToken = randomBytes(24).toString('hex')));
    return json(urls(origin(req), token));
  });
}
