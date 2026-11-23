import type { NextRequest } from 'next/server';
import type { Booking } from '@/lib/types';
import { getPackage, priceFor } from '@/lib/packages';
import { fromMin, toMin } from '@/lib/time';
import { mutate, readDb } from '@/server/db';
import { businessNow } from '@/server/clock';
import { bookingConflicts, isBookable } from '@/server/availability';
import { clientIp, fail, guardAdmin, guarded, HttpError, json, readJson, zodFail } from '@/server/http';
import { allow } from '@/server/rateLimit';
import { newCode, newId } from '@/server/seed';
import { bookingInput, bookingPatch } from '@/server/validate';

export const dynamic = 'force-dynamic';

/** Admin: every booking, newest activity first within each date. */
export async function GET() {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const db = await readDb(3000);
    const bookings = [...db.bookings].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    return json({ today: businessNow().date, bookings });
  });
}

/** Public: book a lesson. The availability check and the insert happen in one locked transaction. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    if (!allow(`book:${clientIp(req)}`, 12, 10 * 60_000)) {
      return fail(429, 'Too many booking attempts. Please wait a few minutes and try again.');
    }
    const parsed = bookingInput.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const input = parsed.data;
    if (input.company) return fail(400, 'Invalid submission.');

    const pkg = getPackage(input.packageId)!;
    if (input.anglers > pkg.maxAnglers) {
      return fail(400, `${pkg.name} fits up to ${pkg.maxAnglers} anglers.`, {
        anglers: `${pkg.name} fits up to ${pkg.maxAnglers} anglers.`,
      });
    }

    const booking = await mutate((db) => {
      const now = businessNow();
      if (!isBookable(db, pkg, input.date, input.start, now)) {
        throw new HttpError(409, 'Sorry, that time was just taken. Please pick another.');
      }
      const created: Booking = {
        id: newId('b'),
        code: newCode(new Set(db.bookings.map((b) => b.code))),
        packageId: pkg.id,
        date: input.date,
        start: input.start,
        end: fromMin(toMin(input.start) + pkg.durationMin),
        name: input.name,
        email: input.email,
        phone: input.phone,
        experience: input.experience,
        anglers: input.anglers,
        notes: input.notes,
        totalPrice: priceFor(pkg, input.anglers),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.bookings.push(created);
      return created;
    });
    return json({ booking }, 201);
  });
}

/** Admin: approve, complete, cancel (frees the slot) or reopen a booking. */
export async function PATCH(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = bookingPatch.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const { id, status } = parsed.data;

    const booking = await mutate((db) => {
      const b = db.bookings.find((x) => x.id === id);
      if (!b) throw new HttpError(404, 'That booking no longer exists.');
      if (b.status === 'cancelled' && status !== 'cancelled' && bookingConflicts(db, b)) {
        throw new HttpError(409, 'Someone else has booked that time since this was cancelled, so it cannot be restored.');
      }
      b.status = status;
      b.updatedAt = new Date().toISOString();
      return b;
    });
    return json({ booking });
  });
}

/** Admin: DELETE ?sample=true removes the seeded demo bookings. */
export async function DELETE(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    if (req.nextUrl.searchParams.get('sample') !== 'true') return fail(400, 'Nothing to delete.');
    const removed = await mutate((db) => {
      const before = db.bookings.length;
      db.bookings = db.bookings.filter((b) => !b.sample);
      return before - db.bookings.length;
    });
    return json({ removed });
  });
}
