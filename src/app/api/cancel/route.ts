import type { NextRequest } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { CANCEL_NOTICE_HOURS, findForCancel, hoursUntilStart } from '@/server/cancel';
import { mutate } from '@/server/db';
import { clientIp, fail, guarded, HttpError, json, readJson, zodFail } from '@/server/http';
import { boazPhone, prettyPhone } from '@/server/notify/config';
import { notifyStudentCancelled } from '@/server/notify/service';
import { allow } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

const body = z.object({ code: z.string().min(4).max(20), token: z.string().min(8).max(64) });

/** Public: a student cancels their own lesson with the private link from their email. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    if (!allow(`cancel:${clientIp(req)}`, 20, 10 * 60_000)) return fail(429, 'Too many attempts. Please wait a few minutes and try again.');
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const found = await findForCancel(parsed.data.code, parsed.data.token);
    if (!found) return fail(404, 'This cancel link is not valid. Please use the link from your latest email, or text Boaz.');

    const result = await mutate((db) => {
      const b = db.bookings.find((x) => x.id === found.id);
      if (!b) throw new HttpError(404, 'That lesson no longer exists.');
      if (b.status === 'cancelled') return { state: 'already' as const, booking: b };
      if (b.status === 'completed') throw new HttpError(409, 'That lesson has already taken place.');
      if (hoursUntilStart(b) < CANCEL_NOTICE_HOURS) {
        const phone = boazPhone();
        throw new HttpError(409, `Lessons can be cancelled online up to ${CANCEL_NOTICE_HOURS} hours ahead. Please text Boaz${phone ? ` at ${prettyPhone(phone)}` : ''} to cancel this one.`);
      }
      b.status = 'cancelled';
      b.cancelledBy = 'student';
      b.updatedAt = new Date().toISOString();
      return { state: 'cancelled' as const, booking: { ...b } };
    });
    if (result.state === 'cancelled') after(() => notifyStudentCancelled(result.booking));
    return json({ ok: true, state: result.state });
  });
}
