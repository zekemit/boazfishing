import type { Booking } from '@/lib/types';
import { PROGRAM, getPackage, sessionLabel } from '@/lib/packages';
import { fmtDateShort, fmtRange } from '@/lib/time';
import { businessTz, localToUtc } from './clock';
import { meetingFor } from './meeting';

const stampUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** RFC 5545 text escaping and 75-octet line folding. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut)) > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = ' ' + rest.slice(cut);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function lessonTitle(b: Booking): string {
  return `${sessionLabel(b.packageId, false)}: ${b.name}`;
}

export function lessonDescription(b: Booking, adminUrl?: string): string {
  const pkg = getPackage(b.packageId);
  const lines = [
    `${PROGRAM.name}, ${sessionLabel(b.packageId)}${b.sessionNo === 1 || !b.sessionNo ? `. Program $${PROGRAM.price} due in person` : ''}`,
    `Booked by: ${b.name}`,
    `Phone: ${b.phone}`,
    `Email: ${b.email}`,
    `Status: ${b.status}`,
    `Code: ${b.code}`,
  ];
  if (pkg?.tideGate) lines.push(pkg.tideGate.label);
  if (b.notes) lines.push(`Notes from family: ${b.notes}`);
  if (adminUrl) lines.push(`Manage: ${adminUrl}`);
  return lines.join('\n');
}

function vevent(b: Booking, host: string, adminUrl?: string): string[] {
  const start = localToUtc(b.date, b.start);
  const end = localToUtc(b.date, b.end);
  const status = b.status === 'confirmed' || b.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE';
  return [
    'BEGIN:VEVENT',
    `UID:${b.id}@${host}`,
    `DTSTAMP:${stampUtc(new Date(b.updatedAt))}`,
    `LAST-MODIFIED:${stampUtc(new Date(b.updatedAt))}`,
    `DTSTART:${stampUtc(start)}`,
    `DTEND:${stampUtc(end)}`,
    `SUMMARY:${esc(lessonTitle(b) + (b.status === 'pending' ? ' (needs approval)' : ''))}`,
    `LOCATION:${esc(meetingFor(b.packageId).full)}`,
    `DESCRIPTION:${esc(lessonDescription(b, adminUrl))}`,
    `STATUS:${status}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ];
}

/** A full subscribable calendar of every session that is not cancelled. Cancelled sessions simply disappear on refresh. */
export function buildFeed(bookings: Booking[], host: string, adminUrl: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boaz Fishing Co.//Lessons//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Boaz Fishing Co. Lessons',
    `X-WR-TIMEZONE:${businessTz()}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...bookings.filter((b) => b.status !== 'cancelled').flatMap((b) => vevent(b, host, adminUrl)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** One booking as a downloadable .ics for the instructor (Add to Google Calendar / Download .ics on a booking card). */
export function buildSingle(b: Booking, host: string): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boaz Fishing Co.//Lessons//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...vevent(b, host), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}

/**
 * The family's calendar invite: every session of the program as its own event. A higher SEQUENCE tells their
 * calendar this replaces the earlier invite, and cancelled sessions carry STATUS:CANCELLED so they drop off.
 */
export function buildStudentCalendar(sessions: Booking[], host: string, opts: { sequence?: number; method?: 'PUBLISH' | 'CANCEL' } = {}): string {
  const events = sessions.flatMap((b) => {
    const cancelled = b.status === 'cancelled';
    const meet = meetingFor(b.packageId);
    return [
      'BEGIN:VEVENT',
      `UID:${b.id}@${host}`,
      `DTSTAMP:${stampUtc(new Date(b.updatedAt))}`,
      `SEQUENCE:${opts.sequence ?? 0}`,
      `DTSTART:${stampUtc(localToUtc(b.date, b.start))}`,
      `DTEND:${stampUtc(localToUtc(b.date, b.end))}`,
      `SUMMARY:${esc(`${cancelled ? 'Cancelled: ' : ''}${sessionLabel(b.packageId, false)}: ${PROGRAM.name}`)}`,
      `LOCATION:${esc(meet.full)}`,
      `DESCRIPTION:${esc(cancelled ? `Confirmation ${b.code}. This session was cancelled.` : `Confirmation ${b.code}. ${sessionLabel(b.packageId)}. Meet ${meet.lower}. Bring a cast net and spinner rod, or Boaz can provide them.`)}`,
      `STATUS:${cancelled ? 'CANCELLED' : b.status === 'pending' && (opts.sequence ?? 0) < 1 ? 'TENTATIVE' : 'CONFIRMED'}`,
      'END:VEVENT',
    ];
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boaz Fishing Co.//Lessons//EN', 'CALSCALE:GREGORIAN', `METHOD:${opts.method ?? 'PUBLISH'}`, ...events, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}

export { fmtDateShort, fmtRange };
