import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { addDays } from '@/lib/time';
import type { CalendarImport, SuggestPrefs } from '@/lib/types';
import { buildImport } from '@/server/calendarImport';
import { businessNow } from '@/server/clock';
import { mutate, readDb } from '@/server/db';
import { guardAdmin, guarded, json, readJson, zodFail } from '@/server/http';
import { DEFAULT_PREFS, buildSuggestions } from '@/server/suggest';
import { getHighTides } from '@/server/tides';
import { timeStr } from '@/server/validate';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const STALE_MS = 30 * 60_000;

const prefsSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).max(7),
  earliest: timeStr,
  latest: timeStr,
  bufferMin: z.number().int().min(0).max(180),
  aheadDays: z.number().int().min(7).max(120),
  allDayBusy: z.boolean(),
  flex: z.boolean(),
});

/** What the browser may know about the imported calendar: never the secret address or event titles in bulk. */
function calendarStatus(c: CalendarImport | null | undefined) {
  if (!c) return { connected: false as const };
  const future = c.events.filter((e) => e.e > Date.now());
  return {
    connected: true as const,
    source: c.source,
    label: c.label,
    syncedAt: c.syncedAt,
    count: future.length,
    error: c.error ?? null,
    canRefresh: c.source === 'url',
  };
}

/** Admin: ranked one-tap availability suggestions from tides, the imported calendar and what is already open. */
export async function GET() {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    let db = await readDb(0);
    // A linked calendar refreshes itself when it is more than 30 minutes old.
    const cal = db.calendarImport;
    if (cal?.source === 'url' && cal.url && Date.now() - Date.parse(cal.syncedAt) > STALE_MS) {
      try {
        const fresh = await buildImport({ url: cal.url });
        await mutate((d) => void (d.calendarImport = fresh));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Refresh failed.';
        await mutate((d) => {
          if (d.calendarImport) d.calendarImport.error = msg;
        });
      }
      db = await readDb(0);
    }
    const prefs: SuggestPrefs = { ...DEFAULT_PREFS, ...(db.suggestPrefs ?? {}) };
    const now = businessNow();
    const highs = await getHighTides(addDays(now.date, -1), addDays(now.date, prefs.aheadDays + 1));
    const result = buildSuggestions({ db, now, prefs, highs, busy: db.calendarImport?.events ?? [] });
    return json({ prefs, calendar: calendarStatus(db.calendarImport), tideUnavailable: !highs, ...result });
  });
}

/** Admin: save the preferences the suggestions use. */
export async function PUT(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = prefsSchema.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    await mutate((db) => void (db.suggestPrefs = parsed.data));
    return json({ prefs: parsed.data });
  });
}
