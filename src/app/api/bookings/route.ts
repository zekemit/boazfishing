import { after, type NextRequest } from 'next/server';
import type { Booking } from '@/lib/types';
import { PACKAGES, PROGRAM } from '@/lib/packages';
import { fmtDateShort, fmt12, fromMin, toMin } from '@/lib/time';
import { mutate, readDb } from '@/server/db';
import { businessNow, businessTz } from '@/server/clock';
import { cancelPath } from '@/server/cancel';
import { meetingFor } from '@/server/meeting';
import { notifyNewBooking, notifyStatusChange } from '@/server/notify/service';
import { bookingConflicts, isBookable } from '@/server/availability';
import { getHighTides } from '@/server/tides';
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
    return json({ today: businessNow().date, tz: businessTz(), bookings });
  });
}

/**
 * Public: book the Learn to Fish With Boaz program. A family picks a time for each of the three sessions; they are
 * checked and saved together in one locked transaction, so either all three are booked or none are.
 */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    if (!allow(`book:${clientIp(req)}`, 12, 10 * 60_000)) {
      return fail(429, 'Too many booking attempts. Please wait a few minutes and try again.');
    }
    const parsed = bookingInput.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const input = parsed.data;
    if (input.company) return fail(400, 'Invalid submission.');
    const slots = input.sessions;

    // The sessions build on each other, so each one has to be on a later day than the one before.
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].date <= slots[i - 1].date) {
        return fail(400, `Session ${i + 1} needs to be on a later day than session ${i}.`, { sessions: `Session ${i + 1} needs to be on a later day than session ${i}.` });
      }
    }

    // Tide times are fetched before the locked transaction so the lock is never held during a network call.
    const gatedDates = slots.filter((_, i) => PACKAGES[i].tideGate).map((s) => s.date).sort();
    const tides = gatedDates.length ? await getHighTides(gatedDates[0], gatedDates[gatedDates.length - 1]) : null;
    if (gatedDates.length && !tides) {
      return fail(503, "Tide times are temporarily unavailable, so sessions 2 and 3 can't be booked right now. Please try again in a few minutes.");
    }

    const created = await mutate((db) => {
      const now = businessNow();
      slots.forEach((s, i) => {
        if (!isBookable(db, PACKAGES[i], s.date, s.start, now, tides ?? undefined)) {
          throw new HttpError(409, `Sorry, session ${i + 1} (${fmtDateShort(s.date)} at ${fmt12(s.start)}) is no longer available. Please pick another time.`);
        }
      });
      const code = newCode(new Set(db.bookings.map((b) => b.code)));
      const groupId = newId('g');
      const at = new Date().toISOString();
      const made: Booking[] = slots.map((s, i) => ({
        id: newId('b'),
        code,
        groupId,
        sessionNo: i + 1,
        packageId: PACKAGES[i].id,
        date: s.date,
        start: s.start,
        end: fromMin(toMin(s.start) + PACKAGES[i].durationMin),
        name: input.name,
        email: input.email,
        phone: input.phone,
        experience: input.experience,
        anglers: 1,
        notes: input.notes,
        // The program price ($100 for all three sessions) is charged once, on session 1.
        totalPrice: i === 0 ? PROGRAM.price : 0,
        status: 'pending',
        createdAt: at,
        updatedAt: at,
      }));
      db.bookings.push(...made);
      return made;
    });
    // Email the family and ping Boaz's phone after the response is sent. Can never fail the booking.
    after(() => notifyNewBooking(created));
    return json({ bookings: created, cancelUrl: await cancelPath(created[0]), meetings: created.map((b) => meetingFor(b.packageId)) }, 201);
  });
}

/** Admin: approve, complete, cancel (frees the slot) or reopen a session. Approving one session approves the whole program. */
export async function PATCH(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = bookingPatch.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const { id, status, notify, tags, practiced, lessonNotes } = parsed.data;

    const { booking, previous, approved } = await mutate((db) => {
      const b = db.bookings.find((x) => x.id === id);
      if (!b) throw new HttpError(404, 'That booking no longer exists.');
      let previous = b.status;
      let approved: Booking[] = [];
      const at = new Date().toISOString();
      if (status !== undefined) {
        if (b.status === 'cancelled' && status !== 'cancelled' && bookingConflicts(db, b)) {
          throw new HttpError(409, 'Someone else has booked that time since this was cancelled, so it cannot be restored.');
        }
        previous = b.status;
        b.status = status;
        if (status === 'cancelled' && previous !== 'cancelled') b.cancelledBy = 'instructor';
        // One tap approves every pending session of the same program.
        if (status === 'confirmed' && previous === 'pending' && b.groupId) {
          for (const s of db.bookings) {
            if (s.groupId === b.groupId && s.id !== b.id && s.status === 'pending') {
              s.status = 'confirmed';
              s.updatedAt = at;
            }
          }
        }
        if (status === 'confirmed' && previous === 'pending') approved = db.bookings.filter((s) => (b.groupId ? s.groupId === b.groupId : s.id === b.id) && s.status !== 'cancelled').map((s) => ({ ...s }));
      }
      if (tags !== undefined) b.tags = [...new Set(tags)];
      if (practiced !== undefined) b.practiced = [...new Set(practiced)];
      if (lessonNotes !== undefined) b.lessonNotes = lessonNotes;
      b.updatedAt = at;
      return { booking: { ...b }, previous, approved };
    });
    // Tell the family when Boaz approves their program or cancels a session. Only on a real change, so a double click can't email twice.
    if (notify !== false && status && previous !== status) {
      if (status === 'confirmed' && previous === 'pending') after(() => notifyStatusChange(approved, 'approved'));
      if (status === 'cancelled') after(() => notifyStatusChange([booking], 'cancelled'));
    }
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
