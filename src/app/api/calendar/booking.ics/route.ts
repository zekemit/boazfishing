import type { NextRequest } from 'next/server';
import { buildSingle } from '@/server/calendar';
import { readDb } from '@/server/db';
import { guardAdmin } from '@/server/http';
import { siteUrl } from '@/server/notify/config';

export const dynamic = 'force-dynamic';

/** Admin: download one booking as an .ics file (the "Download .ics" button on each booking). */
export async function GET(req: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  const b = (await readDb(3000)).bookings.find((x) => x.id === id);
  if (!b) return new Response('Not found', { status: 404 });
  return new Response(buildSingle(b, new URL(siteUrl()).host), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="boaz-lesson-${b.code}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
