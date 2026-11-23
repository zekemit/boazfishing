import type { NextRequest } from 'next/server';
import type { AvailabilityWindow, DB } from '@/lib/types';
import { getPackage } from '@/lib/packages';
import { addDays, eachDate, fmtRange, fromMin, isValidDate, toMin, weekday } from '@/lib/time';
import { mutate, readDb } from '@/server/db';
import { businessNow } from '@/server/clock';
import { bookableDays, isActive, overlaps } from '@/server/availability';
import { getHighTides } from '@/server/tides';
import { fail, guardAdmin, guarded, HttpError, json, readJson, zodFail } from '@/server/http';
import { newId } from '@/server/seed';
import { availabilityAction, windowPatch } from '@/server/validate';

export const dynamic = 'force-dynamic';

const MAX_RANGE_DAYS = 800;

function findOverlap(db: DB, date: string, start: string, end: string, ignoreId?: string) {
  return db.windows.find(
    (w) => w.id !== ignoreId && w.date === date && overlaps(toMin(start), toMin(end), toMin(w.start), toMin(w.end)),
  );
}

function rangeDates(startDate: string, endDate: string, days: number[]): string[] {
  if (endDate < startDate) throw new HttpError(400, 'The end date must be on or after the start date.');
  if (eachDateCount(startDate, endDate) > MAX_RANGE_DAYS) throw new HttpError(400, 'Pick a range of about two years or less.');
  return eachDate(startDate, endDate).filter((d) => days.includes(weekday(d)));
}

function eachDateCount(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;
}

/**
 * Public:  GET ?package=<id>            -> bookable start times by date (booked/blocked/past already removed)
 * Admin:   GET ?view=admin&from=&to=    -> raw windows (open + blocked) and active bookings in range
 */
export async function GET(req: NextRequest) {
  return guarded(async () => {
    const sp = req.nextUrl.searchParams;
    const now = businessNow();
    const isAdminView = sp.get('view') === 'admin';
    if (isAdminView) {
      const denied = await guardAdmin();
      if (denied) return denied;
    }
    // The instructor sees near-live data; guests may see a copy a few seconds old (booking re-checks the real thing).
    const db = await readDb(isAdminView ? 3000 : undefined);

    if (isAdminView) {
      const from = sp.get('from') ?? addDays(now.date, -7);
      const to = sp.get('to') ?? addDays(now.date, 60);
      if (!isValidDate(from) || !isValidDate(to) || to < from) return fail(400, 'Invalid date range.');
      const windows = db.windows
        .filter((w) => w.date >= from && w.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
      const bookings = db.bookings
        .filter((b) => b.date >= from && b.date <= to && isActive(b))
        .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
      return json({ today: now.date, windows, bookings });
    }

    const pkg = getPackage(sp.get('package'));
    if (!pkg) return fail(400, 'Unknown lesson package.');
    let tides: Awaited<ReturnType<typeof getHighTides>> = null;
    if (pkg.tideGate) {
      const dates = db.windows.filter((w) => w.status === 'open' && w.date >= now.date).map((w) => w.date).sort();
      if (dates.length) tides = await getHighTides(dates[0], dates[dates.length - 1]);
      if (dates.length && !tides) return json({ today: now.date, packageId: pkg.id, days: {}, next: null, tideUnavailable: true });
    }
    const { days, next } = bookableDays(db, pkg, now, tides ?? undefined);
    // For tide-gated lessons, tell the page when high tide is so it can explain the start times.
    const highTides: Record<string, string[]> = {};
    if (tides) for (const date of Object.keys(days)) highTides[date] = (tides.get(date) ?? []).filter((m) => m >= 0 && m < 1440).map(fromMin);
    return json({ today: now.date, packageId: pkg.id, days, next, ...(pkg.tideGate ? { highTides, timingNote: pkg.tideGate.label } : {}) });
  });
}

/** Admin: add open blocks (single day or recurring), or bulk open/block/remove across a range. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = availabilityAction.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const input = parsed.data;
    const now = businessNow();

    const result = await mutate((db) => {
      switch (input.action) {
        case 'add': {
          if (input.date < now.date) throw new HttpError(400, "You can't add availability in the past.");
          const fresh: AvailabilityWindow[] = [];
          for (const block of input.blocks) {
            const clash = findOverlap(db, input.date, block.start, block.end);
            if (clash) {
              throw new HttpError(
                409,
                `${fmtRange(block.start, block.end)} overlaps an existing block (${fmtRange(clash.start, clash.end)}).`,
              );
            }
            const selfClash = fresh.find((f) => overlaps(toMin(block.start), toMin(block.end), toMin(f.start), toMin(f.end)));
            if (selfClash) throw new HttpError(409, 'Those time blocks overlap each other.');
            fresh.push({ id: newId('w'), date: input.date, start: block.start, end: block.end, status: 'open' });
          }
          db.windows.push(...fresh);
          return { added: fresh.length, skipped: 0, days: 1, changed: fresh.length, removed: 0, ids: fresh.map((w) => w.id) };
        }
        case 'add-many': {
          // The suggestion tool's "add all": add every item that still fits, skip the rest.
          const ids: string[] = [];
          let skipped = 0;
          const days = new Set<string>();
          for (const item of input.items) {
            if (item.date < now.date || toMin(item.end) <= toMin(item.start) || findOverlap(db, item.date, item.start, item.end)) {
              skipped++;
              continue;
            }
            const w: AvailabilityWindow = { id: newId('w'), date: item.date, start: item.start, end: item.end, status: 'open' };
            db.windows.push(w);
            ids.push(w.id);
            days.add(item.date);
          }
          return { added: ids.length, skipped, days: days.size, changed: ids.length, removed: 0, ids };
        }
        case 'bulk-add': {
          const dates = rangeDates(input.startDate, input.endDate, input.weekdays);
          let added = 0;
          let skipped = 0;
          const touched = new Set<string>();
          for (const date of dates) {
            if (date < now.date) {
              skipped += input.blocks.length;
              continue;
            }
            for (const block of input.blocks) {
              if (findOverlap(db, date, block.start, block.end)) {
                skipped++;
                continue;
              }
              db.windows.push({ id: newId('w'), date, start: block.start, end: block.end, status: 'open' });
              added++;
              touched.add(date);
            }
          }
          return { added, skipped, days: touched.size, changed: added, removed: 0 };
        }
        case 'bulk-set': {
          const dates = new Set(rangeDates(input.startDate, input.endDate, input.weekdays));
          let changed = 0;
          const touched = new Set<string>();
          for (const w of db.windows) {
            if (!dates.has(w.date) || w.date < now.date || w.status === input.status) continue;
            w.status = input.status;
            changed++;
            touched.add(w.date);
          }
          return { added: 0, skipped: 0, days: touched.size, changed, removed: 0 };
        }
        case 'bulk-remove': {
          const dates = new Set(rangeDates(input.startDate, input.endDate, input.weekdays));
          const before = db.windows.length;
          const touched = new Set<string>();
          db.windows = db.windows.filter((w) => {
            const drop = dates.has(w.date) && w.date >= now.date;
            if (drop) touched.add(w.date);
            return !drop;
          });
          return { added: 0, skipped: 0, days: touched.size, changed: 0, removed: before - db.windows.length };
        }
      }
    });
    return json(result);
  });
}

/** Admin: toggle a block between Available and Blocked, or change its times. */
export async function PATCH(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = windowPatch.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const { id, status, start, end } = parsed.data;

    const updated = await mutate((db) => {
      const w = db.windows.find((x) => x.id === id);
      if (!w) throw new HttpError(404, 'That time block no longer exists.');
      const nextStart = start ?? w.start;
      const nextEnd = end ?? w.end;
      if (toMin(nextEnd) <= toMin(nextStart)) throw new HttpError(400, 'End time must be after the start time.');
      const clash = findOverlap(db, w.date, nextStart, nextEnd, w.id);
      if (clash) throw new HttpError(409, `That overlaps another block (${fmtRange(clash.start, clash.end)}).`);
      w.start = nextStart;
      w.end = nextEnd;
      if (status) w.status = status;
      return w;
    });
    return json({ window: updated });
  });
}

/** Admin: delete a time block. Lessons already booked in it are untouched. */
export async function DELETE(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return fail(400, 'Missing block id.');
    await mutate((db) => {
      const before = db.windows.length;
      db.windows = db.windows.filter((w) => w.id !== id);
      if (db.windows.length === before) throw new HttpError(404, 'That time block no longer exists.');
    });
    return json({ ok: true });
  });
}
