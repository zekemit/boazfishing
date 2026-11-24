import type { Booking } from '@/lib/types';
import { getPackage } from '@/lib/packages';
import { fmtDateShort, fmtRange } from '@/lib/time';
import { meetingFor } from './meeting';
import { businessTz, localToUtc } from './clock';

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
  const pkg = getPackage(b.packageId);
  return `${pkg?.name ?? 'Lesson'}: ${b.name}${b.anglers > 1 ? ` (${b.anglers})` : ''}`;
}

export function lessonDescription(b: Booking, adminUrl?: string): string {
  const pkg = getPackage(b.packageId);
  const lines = [
    `${pkg?.name ?? 'Lesson'}, ${b.anglers} angler${b.anglers === 1 ? '' : 's'}, $${b.totalPrice} due in person`,
    `Student: ${b.name}`,
    `Phone: ${b.phone}`,
    `Email: ${b.email}`,
    `Status: ${b.status}`,
    `Code: ${b.code}`,
  ];
  if (b.notes) lines.push(`Notes from student: ${b.notes}`);
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

/** A full subscribable calendar of every lesson that is not cancelled. Cancelled lessons simply disappear on refresh. */
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

/** One booking as a downloadable .ics (also attached to the student's confirmation email). */
export function buildSingle(b: Booking, host: string, opts: { forStudent?: boolean; sequence?: number; cancel?: boolean } = {}): string {
  const pkg = getPackage(b.packageId);
  const ev = opts.forStudent
    ? [
        'BEGIN:VEVENT',
        `UID:${b.id}@${host}`,
        `DTSTAMP:${stampUtc(new Date(b.updatedAt))}`,
        // A higher SEQUENCE tells calendar apps this replaces (or, with CANCELLED, removes) the earlier invite.
        `SEQUENCE:${opts.sequence ?? 0}`,
        `DTSTART:${stampUtc(localToUtc(b.date, b.start))}`,
        `DTEND:${stampUtc(localToUtc(b.date, b.end))}`,
        `SUMMARY:${esc(`${opts.cancel ? 'Cancelled: ' : ''}${pkg?.name ?? 'Fishing lesson'} with Boaz Fishing Co.`)}`,
        `LOCATION:${esc(meetingFor(b.packageId).full)}`,
        `DESCRIPTION:${esc(opts.cancel ? `Confirmation ${b.code}. This lesson was cancelled.` : `Confirmation ${b.code}. Meet ${meetingFor(b.packageId).lower}. Pay in person.`)}`,
        `STATUS:${opts.cancel ? 'CANCELLED' : (opts.sequence ?? 0) >= 1 ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT',
      ]
    : vevent(b, host);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boaz Fishing Co.//Lessons//EN', 'CALSCALE:GREGORIAN', `METHOD:${opts.cancel ? 'CANCEL' : 'PUBLISH'}`, ...ev, 'END:VCALENDAR']
    .map(fold)
    .join('\r\n') + '\r\n';
}

export { fmtDateShort, fmtRange };
