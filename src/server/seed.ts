import crypto from 'node:crypto';
import type { AvailabilityWindow, Booking, DB, Experience, PackageId } from '@/lib/types';
import { defaultPhotos } from '@/lib/photos';
import { getPackage, priceFor } from '@/lib/packages';
import { addDays, fromMin, toMin, weekday } from '@/lib/time';
import { businessNow } from './clock';

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode(existing: Set<string>): string {
  for (;;) {
    const bytes = crypto.randomBytes(5);
    let s = '';
    for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
    const code = `BFC-${s}`;
    if (!existing.has(code)) return code;
  }
}

/**
 * First-run data: a realistic availability calendar that always starts tomorrow, so the
 * booking calendar has dates to pick the moment the app boots, plus a handful of sample
 * bookings (flagged `sample`) so the admin dashboard has something to show.
 */
export function buildSeed(): DB {
  const now = businessNow();
  const today = now.date;
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const summerYear = month <= 8 ? year : year + 1;
  const summerStart = `${summerYear}-06-01`;
  const summerEnd = `${summerYear}-08-31`;
  const horizon = summerEnd > addDays(today, 90) ? summerEnd : addDays(today, 90);

  const windows: AvailabilityWindow[] = [];
  const add = (date: string, start: string, end: string) =>
    windows.push({ id: newId('w'), date, start, end, status: 'open' });

  for (let d = addDays(today, 1); d <= horizon; d = addDays(d, 1)) {
    const dow = weekday(d);
    const inSummer = d >= summerStart && d <= summerEnd;
    if (inSummer) {
      if (dow === 1) continue; // Mondays off
      add(d, '07:00', '11:00');
      add(d, '17:00', '19:30');
    } else if ((dow === 6 || dow === 0) && d <= addDays(today, 56)) {
      add(d, '08:00', '12:00'); // shoulder-season weekend mornings
    }
  }

  // A few blocked windows so the manager shows both states.
  for (const w of windows) {
    if (w.date === `${summerYear}-07-03` || w.date === `${summerYear}-07-04`) w.status = 'blocked';
  }
  const summerEvenings = windows.filter((w) => w.start === '17:00' && w.date >= summerStart && weekday(w.date) === 3);
  summerEvenings.filter((_, i) => i % 5 === 2).forEach((w) => (w.status = 'blocked'));

  // Sample bookings on the first few weekend windows.
  const codes = new Set<string>();
  const nowIso = new Date().toISOString();
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const bookings: Booking[] = [];
  const mk = (
    packageId: PackageId,
    date: string,
    start: string,
    guest: { name: string; email: string; phone: string; experience: Experience; anglers: number; notes: string },
    status: Booking['status'],
    createdAgoMs: number,
  ) => {
    const pkg = getPackage(packageId)!;
    bookings.push({
      id: newId('b'),
      code: newCode(codes),
      packageId,
      date,
      start,
      end: fromMin(toMin(start) + pkg.durationMin),
      ...guest,
      totalPrice: priceFor(pkg, guest.anglers),
      status,
      createdAt: ago(createdAgoMs),
      updatedAt: nowIso,
      sample: true,
    });
    codes.add(bookings[bookings.length - 1].code);
  };

  // Set BOAZ_SEED_SAMPLES=false for a live site: seed the calendar but no fake customers.
  const withSamples = process.env.BOAZ_SEED_SAMPLES !== 'false';
  const weekendWindows = !withSamples ? [] : windows.filter((w) => w.status === 'open' && [0, 6].includes(weekday(w.date)) && toMin(w.end) - toMin(w.start) >= 240);
  const [w1, w2, w3, w4] = weekendWindows;
  const H = 3_600_000;
  if (w1) {
    mk('first-cast', w1.date, w1.start, {
      name: 'Jordan Ellis',
      email: 'jordan.ellis@example.com',
      phone: '(555) 010-0142',
      experience: 'first-time',
      anglers: 2,
      notes: "Birthday outing for my son, turning 9. He's never held a rod before.",
    }, 'pending', 2 * H);
  }
  if (w2) {
    mk('summer-angler', w2.date, w2.start, {
      name: 'Priya Raman',
      email: 'priya.r@example.com',
      phone: '(555) 010-0177',
      experience: 'some',
      anglers: 2,
      notes: "We can cast but want to learn how to find and catch bigger fish.",
    }, 'confirmed', 26 * H);
  }
  if (w3) {
    mk('first-cast', w3.date, fromMin(toMin(w3.start) + 120), {
      name: 'Tom & Beth Walker',
      email: 'walkers@example.com',
      phone: '(555) 010-0119',
      experience: 'first-time',
      anglers: 2,
      notes: 'Newly retired and finally learning. Please go easy on us!',
    }, 'pending', 5 * H);
  }
  if (w4) {
    mk('first-cast', w4.date, w4.start, {
      name: 'Chris Dalton',
      email: 'chris.d@example.com',
      phone: '(555) 010-0108',
      experience: 'some',
      anglers: 1,
      notes: 'Had to cancel, work trip came up.',
    }, 'cancelled', 72 * H);
  }
  if (withSamples) {
    mk('sunset-session', addDays(today, -6), '17:00', {
      name: 'Marcus Tran',
      email: 'marcus.tran@example.com',
      phone: '(555) 010-0163',
      experience: 'confident',
      anglers: 3,
      notes: 'Family evening on the water. Kids are 7, 10 and 12.',
    }, 'completed', 9 * 24 * H);
  }

  return {
    version: 1,
    secret: crypto.randomBytes(32).toString('hex'),
    windows,
    bookings,
    photos: defaultPhotos(),
  };
}
