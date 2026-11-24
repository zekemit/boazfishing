import { randomBytes } from 'node:crypto';
import type { Booking, DB, NotificationEntry, NotifyKind } from '@/lib/types';
import { PROGRAM } from '@/lib/packages';
import { addDays } from '@/lib/time';
import { businessNow, localToUtc } from '../clock';
import { mutate, readDb } from '../db';
import { buildStudentCalendar } from '../calendar';
import { sendEmail, sendNtfy, sendSms, type SendResult } from './channels';
import { alertEmail, boazPhone, ntfyLive, siteUrl, smsLive, smtpLive, emailLive } from './config';
import { cancelPath } from '../cancel';
import { boazAgenda, boazAlert, boazCancelled, studentApproved, studentCancelled, studentConfirmation, studentReminder } from './templates';

type Pending = Omit<NotificationEntry, 'id' | 'at'>;
const MAX_LOG = 300;
const REMINDER_LEAD_MS = 30 * 3600_000; // send the day-before reminder once a lesson is within 30 hours
const REMINDER_MIN_MS = 60 * 60_000; // ...but not if it starts in under an hour

const entry = (kind: NotifyKind, channel: NotificationEntry['channel'], to: string, subject: string, body: string, r: SendResult, bookingId?: string): Pending => ({
  kind,
  channel,
  to,
  subject,
  body,
  status: r.status,
  ...(r.error ? { error: r.error } : {}),
  ...(bookingId ? { bookingId } : {}),
});

/** Append to the notification log (and optionally update bookings) in one transaction. Never throws. */
async function record(entries: Pending[], patch?: (db: DB) => void): Promise<void> {
  try {
    await mutate((db) => {
      const at = new Date().toISOString();
      db.notifications.unshift(...entries.map((e) => ({ ...e, id: `n_${randomBytes(5).toString('hex')}`, at })));
      db.notifications.length = Math.min(db.notifications.length, MAX_LOG);
      patch?.(db);
    });
  } catch (e) {
    console.error('Could not record notifications', e);
  }
}

/** Boaz's phone: ntfy push, optional real text, optional alert email. With none configured, one simulated entry. */
async function alertBoaz(kind: NotifyKind, title: string, text: string, bookingId?: string): Promise<Pending[]> {
  const click = `${siteUrl()}/admin`;
  const out: Pending[] = [];
  const phone = boazPhone() ?? 'Boaz phone';
  if (ntfyLive()) out.push(entry(kind, 'ntfy', 'Boaz phone (push)', title, text, await sendNtfy(title, text, click), bookingId));
  if (smsLive()) out.push(entry(kind, 'sms', phone, title, text, await sendSms(`${title}. ${text}`), bookingId));
  if (alertEmail()) out.push(entry(kind, 'email', alertEmail(), title, text, await sendEmail(alertEmail(), title, text, `<pre style="font:inherit;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`), bookingId));
  if (!out.length) out.push(entry(kind, 'ntfy', phone, title, text, { status: 'simulated' }, bookingId));
  return out;
}

async function emailStudent(kind: 'student_confirmation' | 'student_approved' | 'student_cancelled' | 'student_reminder' | 'test', sessions: Booking[], m: { subject: string; text: string; html: string }, to = sessions[0].email): Promise<Pending> {
  const host = new URL(siteUrl()).host;
  // Calendar attachment: the invite for every session, an update that replaces it, or a cancel that removes them.
  const ics =
    kind === 'student_reminder'
      ? undefined
      : kind === 'student_cancelled'
        ? buildStudentCalendar(sessions, host, { sequence: 2, method: 'CANCEL' })
        : buildStudentCalendar(sessions, host, { sequence: kind === 'student_approved' ? 1 : 0 });
  const r = await sendEmail(to, m.subject, m.text, m.html, ics, kind === 'student_cancelled' ? 'CANCEL' : 'PUBLISH');
  return entry(kind, 'email', to, m.subject, m.text, r, sessions[0].id);
}

const cancelUrl = async (b: Booking) => `${siteUrl()}${await cancelPath(b)}`;

/** Called right after a program is booked (all three sessions). Never throws, so a missing key can never break booking. */
export async function notifyNewBooking(sessions: Booking[]): Promise<void> {
  try {
    const alert = boazAlert(sessions);
    const [student, boaz] = await Promise.all([
      emailStudent('student_confirmation', sessions, studentConfirmation(sessions, await cancelUrl(sessions[0]))),
      alertBoaz('boaz_alert', alert.title, alert.text, sessions[0].id),
    ]);
    const ids = new Set(sessions.map((s) => s.id));
    await record([student, ...boaz], (db) => {
      if (student.status !== 'sent') return;
      for (const row of db.bookings) if (ids.has(row.id)) row.confirmationSentAt = new Date().toISOString();
    });
  } catch (e) {
    console.error('notifyNewBooking failed', e);
  }
}

/** Emails the family when Boaz approves their program or cancels a session. Never throws. */
export async function notifyStatusChange(sessions: Booking[], kind: 'approved' | 'cancelled'): Promise<void> {
  try {
    const out =
      kind === 'approved'
        ? await emailStudent('student_approved', sessions, studentApproved(sessions, await cancelUrl(sessions[0])))
        : await emailStudent('student_cancelled', sessions, studentCancelled(sessions));
    await record([out]);
  } catch (e) {
    console.error('notifyStatusChange failed', e);
  }
}

/** A family cancelled with their link: confirm to them, and tell Boaz's phone straight away. Never throws. */
export async function notifyStudentCancelled(sessions: Booking[]): Promise<void> {
  try {
    const alert = boazCancelled(sessions);
    const [student, boaz] = await Promise.all([emailStudent('student_cancelled', sessions, studentCancelled(sessions)), alertBoaz('boaz_cancelled', alert.title, alert.text, sessions[0].id)]);
    await record([student, ...boaz]);
  } catch (e) {
    console.error('notifyStudentCancelled failed', e);
  }
}

export interface ReminderRun {
  ranAt: string;
  studentReminders: { sent: number; simulated: number; failed: number };
  agenda: 'sent' | 'simulated' | 'failed' | 'already-sent' | 'too-early' | 'no-lessons';
  lessonsToday: number;
}

/**
 * Idempotent: safe to call as often as you like (a daily Vercel cron, an hourly pinger, the admin button).
 * Each booking is claimed inside a transaction before anything is sent, so concurrent runs never double-send.
 */
export async function runReminders(): Promise<ReminderRun> {
  const now = businessNow();
  const nowMs = Date.now();
  const nowIso = new Date().toISOString();
  const summary: ReminderRun = { ranAt: nowIso, studentReminders: { sent: 0, simulated: 0, failed: 0 }, agenda: 'no-lessons', lessonsToday: 0 };

  // 1) Student reminders about a day ahead
  const due = (b: Booking) => {
    if (b.reminderSentAt || (b.status !== 'pending' && b.status !== 'confirmed')) return false;
    const ahead = localToUtc(b.date, b.start).getTime() - nowMs;
    return ahead >= REMINDER_MIN_MS && ahead <= REMINDER_LEAD_MS;
  };
  const claimed = await mutate((db) => {
    const picked = db.bookings.filter(due);
    for (const b of picked) b.reminderSentAt = nowIso;
    return picked.map((b) => ({ ...b }));
  });
  const results = await Promise.all(claimed.map(async (b) => emailStudent('student_reminder', [b], studentReminder(b, await cancelUrl(b)))));
  results.forEach((r) => (summary.studentReminders[r.status]++));
  const failedIds = claimed.filter((_, i) => results[i].status === 'failed').map((b) => b.id);
  if (results.length) {
    await record(results, (db) => {
      for (const b of db.bookings) if (failedIds.includes(b.id)) delete b.reminderSentAt; // retry on the next run
    });
  }

  // 2) Boaz's morning note about today's lessons (once per day, after 6 AM local)
  const db = await readDb(0);
  const today = db.bookings
    .filter((b) => b.date === now.date && (b.status === 'pending' || b.status === 'confirmed'))
    .sort((a, b) => a.start.localeCompare(b.start));
  summary.lessonsToday = today.length;
  if (!today.length) return summary;
  if (now.minutes < 6 * 60) return { ...summary, agenda: 'too-early' };
  const won = await mutate((d) => {
    if (d.agendaSent[now.date]) return false;
    d.agendaSent[now.date] = nowIso;
    return true;
  });
  if (!won) return { ...summary, agenda: 'already-sent' };
  const msg = boazAgenda(now.date, today);
  const out = await alertBoaz('boaz_agenda', msg.title, msg.text);
  await record(out, (d) => {
    if (out.every((o) => o.status === 'failed')) delete d.agendaSent[now.date];
  });
  summary.agenda = out.some((o) => o.status === 'failed') ? 'failed' : out.every((o) => o.status === 'simulated') ? 'simulated' : 'sent';
  return summary;
}

const SAMPLE = (): Booking[] => {
  const n = businessNow();
  const base = {
    code: 'BFC-TEST1',
    groupId: 'g_sample',
    name: 'Test Parent',
    email: 'student@example.com',
    phone: '(555) 010-0000',
    experience: 'first-time' as const,
    anglers: 1,
    notes: '',
    status: 'confirmed' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return [
    { ...base, id: 'b_sample1', packageId: 'session-1', sessionNo: 1, date: n.date, start: '17:00', end: '17:45', totalPrice: PROGRAM.price },
    { ...base, id: 'b_sample2', packageId: 'session-2', sessionNo: 2, date: addDays(n.date, 3), start: '09:00', end: '09:45', totalPrice: 0 },
    { ...base, id: 'b_sample3', packageId: 'session-3', sessionNo: 3, date: addDays(n.date, 7), start: '10:00', end: '10:45', totalPrice: 0 },
  ];
};

/** The "Send Test Now" button. Goes through exactly the same senders as real notifications. */
export async function sendTest(target: 'phone' | 'agenda' | 'email', to?: string): Promise<Pending[]> {
  const samples = SAMPLE();
  let out: Pending[];
  if (target === 'email') {
    out = [await emailStudent('test', samples, studentConfirmation(samples), to)];
  } else if (target === 'agenda') {
    const m = boazAgenda(samples[0].date, [samples[0]]);
    out = await alertBoaz('test', `TEST: ${m.title}`, m.text);
  } else {
    out = await alertBoaz('test', 'TEST: Boaz Fishing Co. alert', 'If you can read this, phone alerts are working. New bookings will show up like this.');
  }
  await record(out);
  return out;
}

export { smtpLive, emailLive };
