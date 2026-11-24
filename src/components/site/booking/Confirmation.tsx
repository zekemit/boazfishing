'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Backpack, CalendarPlus, Check, MessageSquareText } from 'lucide-react';
import type { MeetingInfo } from '@/content/site';
import { fmtDateLong, fmtRange } from '@/lib/time';
import { EXPERIENCE_LABELS, type Booking } from '@/lib/types';
import { PROGRAM, formatPrice, sessionLabel } from '@/lib/packages';

/** One .ics with an event for each of the three sessions, built right in the browser. */
function buildIcs(sessions: Booking[], meetings: MeetingInfo[]): string {
  const dt = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const events = sessions.flatMap((b, i) => [
    'BEGIN:VEVENT',
    `UID:${b.code}-${b.sessionNo ?? i + 1}@boazfishing`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt(b.date, b.start)}`,
    `DTEND:${dt(b.date, b.end)}`,
    `SUMMARY:${esc(`${sessionLabel(b.packageId, false)}: ${PROGRAM.name}`)}`,
    `LOCATION:${esc(meetings[i]?.full ?? '')}`,
    `DESCRIPTION:${esc(`Confirmation ${b.code}. ${sessionLabel(b.packageId)}. Meet ${meetings[i]?.lower ?? 'where Boaz tells you'}. Bring a cast net and spinner rod, or Boaz can provide them. Boaz will confirm by text or email.`)}`,
    'END:VEVENT',
  ]);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boaz Fishing Co.//Booking//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
}

export function Confirmation({
  sessions,
  meetings,
  cancelUrl,
  onAnother,
}: {
  sessions: Booking[];
  meetings: MeetingInfo[] | null;
  cancelUrl?: string | null;
  onAnother: () => void;
}) {
  const reduce = useReducedMotion();
  const first = sessions[0];
  const meets: MeetingInfo[] = sessions.map((_, i) => meetings?.[i] ?? { full: 'Boaz will text you the meeting spot', lower: 'where Boaz tells you', mapUrl: '', note: null, short: '' });
  const firstName = first.name.trim().split(/\s+/)[0];

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(sessions, meets)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boaz-fishing-${first.code}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="confirmation">
      <div className="flex items-start gap-5">
        {/* The stamp lands like a rubber stamp on the catch log: the one flourish in the flow. */}
        <motion.div
          initial={reduce ? false : { scale: 1.8, rotate: -22, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 430, damping: 17, mass: 0.8 }}
          className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-double border-sunset text-sunset-700"
          aria-hidden
        >
          <Check className="h-9 w-9" strokeWidth={3.2} />
          <span className="display-md -mt-0.5 text-lg">Booked</span>
        </motion.div>
        <div>
          <h3 className="display-md text-3xl sm:text-4xl">You’re on the water, {firstName}.</h3>
          <p className="prose-serif mt-2 text-lg text-ink-soft">
            All {sessions.length} sessions are locked in. Boaz will text or email you to confirm. Confirmation code <strong className="tracking-wide text-ink">{first.code}</strong>.
          </p>
        </div>
      </div>

      <ol className="mt-8 grid gap-3">
        {sessions.map((b, i) => (
          <li key={b.id} className="rounded-xl border border-sand-300 bg-white p-4 sm:p-5" data-testid="confirmed-session">
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="display-md text-xl">Session {b.sessionNo ?? i + 1}</span>
              <span className="text-ink-mute">{sessionLabel(b.packageId).replace(/^Session \d of \d: /, '')}</span>
            </p>
            <p className="mt-1 font-semibold">
              {fmtDateLong(b.date)}, {fmtRange(b.start, b.end)}
            </p>
            <p className="mt-1 text-ink-soft">
              <span className="text-ink-mute">Where to meet: </span>
              <span className="font-semibold text-ink">{meets[i].full}</span>
              {meets[i].mapUrl && (
                <>
                  {' '}
                  <a href={meets[i].mapUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-river underline underline-offset-4">
                    Open in Maps
                  </a>
                </>
              )}
            </p>
            {meets[i].note && <p className="mt-1 text-sm text-ink-soft">{meets[i].note}</p>}
          </li>
        ))}
      </ol>

      <dl className="mt-4 divide-y divide-sand-300 rounded-xl border border-sand-300 bg-white">
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 px-5 py-3.5">
          <dt className="text-ink-mute">Learner</dt>
          <dd className="font-semibold">1 on 1, {EXPERIENCE_LABELS[first.experience].toLowerCase()}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 px-5 py-3.5">
          <dt className="text-ink-mute">Due in person</dt>
          <dd className="font-semibold">
            {formatPrice(PROGRAM.price)} for all {PROGRAM.sessionCount} sessions
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-3 rounded-xl bg-river-50 p-5">
        <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
        <div className="text-ink-soft">
          <p className="font-semibold text-ink">What happens next</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Boaz reviews your request and confirms by text or email.</li>
            <li>You will get a reminder and a weather check before each session.</li>
            <li>{PROGRAM.jig}.</li>
            <li>{PROGRAM.flexNote}</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-sand-300 bg-white p-5">
        <Backpack className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
        <div className="text-ink-soft">
          <p className="font-semibold text-ink">What to bring</p>
          <p className="mt-1">
            {PROGRAM.bring}. {PROGRAM.bringNote}
          </p>
        </div>
      </div>

      {cancelUrl && (
        <p className="mt-4 text-sm text-ink-soft">
          Plans change? You can <a href={cancelUrl} className="font-semibold text-river underline underline-offset-4">cancel your sessions</a> up to 24 hours ahead. We also put this link in your emails.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={downloadIcs} className="btn-dark">
          <CalendarPlus className="h-5 w-5" aria-hidden /> Add all 3 to calendar
        </button>
        <button type="button" onClick={onAnother} className="btn-outline">
          Book for another learner
        </button>
      </div>
    </div>
  );
}
