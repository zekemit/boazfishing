import type { NextRequest } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { CANCEL_NOTICE_HOURS, cancellable, findForCancel, hoursUntilStart, startMs } from '@/server/cancel';
import { mutate } from '@/server/db';
import { clientIp, fail, guarded, HttpError, json, readJson, zodFail } from '@/server/http';
import { boazPhone, prettyPhone } from '@/server/notify/config';
import { notifyStudentCancelled } from '@/server/notify/service';
import { allow } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

const body = z.object({ code: z.string().min(4).max(20), token: z.string().min(8).max(64) });

/** Public: a family cancels the sessions they have left, with the private link from their email. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    if (!allow(`cancel:${clientIp(req)}`, 20, 10 * 60_000)) return fail(429, 'Too many attempts. Please wait a few minutes and try again.');
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const found = await findForCancel(parsed.data.code, parsed.data.token);
    if (!found.length) return fail(404, 'This cancel link is not valid. Please use the link from your latest email, or text Boaz.');

    const result = await mutate((db) => {
      const group = db.bookings.filter((x) => x.code === found[0].code);
      const active = cancellable(group).sort((a, b) => startMs(a) - startMs(b));
      if (!active.length) {
        if (group.every((b) => b.status === 'cancelled')) return { state: 'already' as const, bookings: group.map((b) => ({ ...b })) };
        throw new HttpError(409, 'Those sessions have already taken place.');
      }
      if (hoursUntilStart(active[0]) < CANCEL_NOTICE_HOURS) {
        const phone = boazPhone();
        throw new HttpError(409, `Sessions can be cancelled online up to ${CANCEL_NOTICE_HOURS} hours ahead. Your next session is coming up soon, so please text Boaz${phone ? ` at ${prettyPhone(phone)}` : ''} to cancel.`);
      }
      const at = new Date().toISOString();
      for (const b of active) {
        b.status = 'cancelled';
        b.cancelledBy = 'student';
        b.updatedAt = at;
      }
      return { state: 'cancelled' as const, bookings: active.map((b) => ({ ...b })) };
    });
    if (result.state === 'cancelled') after(() => notifyStudentCancelled(result.bookings));
    return json({ ok: true, state: result.state, cancelled: result.state === 'cancelled' ? result.bookings.length : 0 });
  });
}
