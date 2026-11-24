'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CalendarPlus, Check, MessageSquareText } from 'lucide-react';
import { fmtDateLong, fmtRange } from '@/lib/time';
import { EXPERIENCE_LABELS, type Booking } from '@/lib/types';
import { formatPrice, getPackage } from '@/lib/packages';

function buildIcs(b: Booking, lessonName: string): string {
  const dt = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boaz Fishing Co.//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${b.code}@boazfishing`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt(b.date, b.start)}`,
    `DTEND:${dt(b.date, b.end)}`,
    `SUMMARY:${lessonName} with Boaz Fishing Co.`,
    `DESCRIPTION:Confirmation ${b.code}. ${b.anglers} angler${b.anglers === 1 ? '' : 's'}. Boaz will confirm the meeting spot by text or email. Pay in person.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function Confirmation({ booking, cancelUrl, onAnother }: { booking: Booking; cancelUrl?: string | null; onAnother: () => void }) {
  const reduce = useReducedMotion();
  const pkg = getPackage(booking.packageId);
  const firstName = booking.name.trim().split(/\s+/)[0];

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(booking, pkg?.name ?? 'Fishing lesson')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boaz-fishing-${booking.code}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const rows: Array<[string, string]> = [
    ['Confirmation code', booking.code],
    ['Lesson', `${pkg?.name ?? ''} (${pkg?.durationLabel ?? ''})`],
    ['Date', fmtDateLong(booking.date)],
    ['Time', fmtRange(booking.start, booking.end)],
    ['Anglers', `${booking.anglers}, ${EXPERIENCE_LABELS[booking.experience].toLowerCase()}`],
    ['Due at your lesson', formatPrice(booking.totalPrice)],
  ];

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
            Your time is locked in. Boaz will text or email you to confirm the meeting spot.
          </p>
        </div>
      </div>

      <dl className="mt-8 divide-y divide-sand-300 rounded-xl border border-sand-300 bg-white">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 px-5 py-3.5">
            <dt className="text-ink-mute">{k}</dt>
            <dd className="font-semibold">{k === 'Confirmation code' ? <span className="tracking-wide">{v}</span> : v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex gap-3 rounded-xl bg-river-50 p-5">
        <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
        <div className="text-ink-soft">
          <p className="font-semibold text-ink">What happens next</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Boaz reviews your request and confirms by text or email.</li>
            {booking.packageId === 'first-cast' && (
              <li>Your First Cast lesson starts in a relaxed backyard setup, then moves to the pond once your casting is sharp.</li>
            )}
            <li>You will get the meeting spot and a weather check the day before.</li>
            <li>Bring sunscreen, water and a hat. Everything else is provided.</li>
          </ul>
        </div>
      </div>

      {cancelUrl && (
        <p className="mt-4 text-sm text-ink-soft">
          Plans change? You can <a href={cancelUrl} className="font-semibold text-river underline underline-offset-4">cancel this lesson</a> up to 24 hours ahead. We also put this link in your emails.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={downloadIcs} className="btn-dark">
          <CalendarPlus className="h-5 w-5" aria-hidden /> Add to calendar
        </button>
        <button type="button" onClick={onAnother} className="btn-outline">
          Book another lesson
        </button>
      </div>
    </div>
  );
}
