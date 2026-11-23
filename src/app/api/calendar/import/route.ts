import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildImport, MAX_ICS_BYTES } from '@/server/calendarImport';
import { mutate } from '@/server/db';
import { fail, guardAdmin, guarded, json, readJson, zodFail } from '@/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const body = z.union([
  z.object({ url: z.string().min(8).max(2000) }),
  z.object({ ics: z.string().min(20).max(MAX_ICS_BYTES), name: z.string().max(80).optional() }),
  z.object({ refresh: z.literal(true) }),
]);

/** Admin: connect Boaz's own calendar (secret iCal address, or an uploaded .ics) so suggestions avoid his busy times. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = body.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const input = parsed.data;
    let source: { url: string } | { ics: string; name?: string };
    if ('refresh' in input) {
      const { readDb } = await import('@/server/db');
      const url = (await readDb(0)).calendarImport?.url;
      if (!url) return fail(400, 'No linked calendar to refresh.');
      source = { url };
    } else source = input;
    let cal;
    try {
      cal = await buildImport(source);
    } catch (e) {
      return fail(400, e instanceof Error ? e.message : 'Could not import that calendar.');
    }
    await mutate((db) => void (db.calendarImport = cal));
    return json({ ok: true, label: cal.label, count: cal.events.filter((e) => e.e > Date.now()).length });
  });
}

/** Admin: disconnect and forget the imported calendar. */
export async function DELETE() {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    await mutate((db) => void (db.calendarImport = null));
    return json({ ok: true });
  });
}
