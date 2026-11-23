import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { readDb } from '@/server/db';
import { fail, guardAdmin, guarded, json, readJson, zodFail } from '@/server/http';
import { boazPhone, channelStatuses, env, prettyPhone } from '@/server/notify/config';
import { sendTest } from '@/server/notify/service';

export const dynamic = 'force-dynamic';

/** Admin: channel status plus the log of every email and phone alert sent (or simulated). */
export async function GET() {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const db = await readDb(3000);
    const phone = boazPhone();
    return json({
      channels: channelStatuses(),
      boazPhone: phone ? prettyPhone(phone) : null,
      cronProtected: Boolean(env('CRON_SECRET')),
      entries: db.notifications.slice(0, 120),
    });
  });
}

const testBody = z.discriminatedUnion('target', [
  z.object({ target: z.literal('phone') }),
  z.object({ target: z.literal('agenda') }),
  z.object({ target: z.literal('email'), to: z.string().trim().toLowerCase().email('Enter a valid email address.') }),
]);

/** Admin: "Send Test Now". Uses the real senders, so a pass here means real bookings will work too. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = testBody.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const out = await sendTest(parsed.data.target, parsed.data.target === 'email' ? parsed.data.to : undefined);
    if (!out.length) return fail(500, 'Nothing was sent.');
    return json({ results: out.map((o) => ({ channel: o.channel, status: o.status, error: o.error })) });
  });
}
