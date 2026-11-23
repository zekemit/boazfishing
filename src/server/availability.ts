import type { AvailabilityWindow, Booking, DB } from '@/lib/types';
import type { LessonPackage } from '@/lib/packages';
import { addDays, fromMin, toMin } from '@/lib/time';
import type { Now } from './clock';

/** Lesson start times sit on this grid inside each open window. */
export const GRID_MIN = 30;
/** Guests can book up to this many minutes before a lesson starts (same-day bookings). */
export const LEAD_MIN = 180;
/** How far ahead guests can book. */
export const HORIZON_DAYS = 540;

/** date -> high tide times in minutes after that date's midnight. */
export type HighTides = Map<string, number[]>;

export const isActive = (b: Booking) => b.status !== 'cancelled';
export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.date);
    if (list) list.push(item);
    else map.set(item.date, [item]);
  }
  return map;
}

/**
 * Bookable start times for one package on one date: every grid step inside an OPEN window where
 * the whole lesson fits, nothing already booked overlaps, and the time hasn't passed.
 */
export function startsFor(
  pkg: LessonPackage,
  date: string,
  windows: AvailabilityWindow[],
  booked: Booking[],
  now: Now,
  /** High tide times as minutes after midnight on `date` (neighbouring days may be negative or above 1440). */
  highs?: number[],
): string[] {
  if (date < now.date) return [];
  // A tide-gated lesson needs known tide times; with none, nothing is offered rather than a wrong time.
  if (pkg.tideGate && !highs?.length) return [];
  const taken = booked.map((b) => [toMin(b.start), toMin(b.end)] as const);
  const dur = pkg.durationMin;
  const out = new Set<number>();
  for (const w of windows) {
    if (w.status !== 'open') continue;
    for (let s = toMin(w.start); s + dur <= toMin(w.end); s += GRID_MIN) {
      if (pkg.earliestStart && s < toMin(pkg.earliestStart)) continue;
      if (date === now.date && s < now.minutes + LEAD_MIN) continue;
      if (pkg.tideGate && !highs!.some((h) => h - s >= pkg.tideGate!.minAhead && h - s <= pkg.tideGate!.maxAhead)) continue;
      if (taken.some(([bs, be]) => overlaps(s, s + dur, bs, be))) continue;
      out.add(s);
    }
  }
  return [...out].sort((a, b) => a - b).map(fromMin);
}

/** Everything bookable for a package, keyed by date, plus the soonest opening. */
export function bookableDays(db: DB, pkg: LessonPackage, now: Now, tides?: HighTides) {
  const limit = addDays(now.date, HORIZON_DAYS);
  const windows = groupByDate(db.windows.filter((w) => w.status === 'open' && w.date >= now.date && w.date <= limit));
  const booked = groupByDate(db.bookings.filter((b) => isActive(b) && b.date >= now.date));
  const days: Record<string, string[]> = {};
  for (const [date, ws] of windows) {
    const starts = startsFor(pkg, date, ws, booked.get(date) ?? [], now, tides?.get(date));
    if (starts.length) days[date] = starts;
  }
  const first = Object.keys(days).sort()[0];
  return { days, next: first ? { date: first, start: days[first][0] } : null };
}

/** The authoritative check used inside the booking transaction. */
export function isBookable(db: DB, pkg: LessonPackage, date: string, start: string, now: Now, tides?: HighTides): boolean {
  return startsFor(
    pkg,
    date,
    db.windows.filter((w) => w.date === date),
    db.bookings.filter((b) => b.date === date && isActive(b)),
    now,
    tides?.get(date),
  ).includes(start);
}

/** Would restoring this booking collide with another active booking? */
export function bookingConflicts(db: DB, booking: Booking): boolean {
  const s = toMin(booking.start);
  const e = toMin(booking.end);
  return db.bookings.some(
    (b) => b.id !== booking.id && b.date === booking.date && isActive(b) && overlaps(s, e, toMin(b.start), toMin(b.end)),
  );
}
