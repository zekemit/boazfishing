import { CalendarDays, Clock, MapPin, ShieldCheck } from 'lucide-react';
import { MEETING } from '@/content/site';
import { cn } from '@/lib/cn';
import { fmtDateLong, fmtDateShort, fmtRange, fromMin, toMin } from '@/lib/time';
import { PACKAGES, PROGRAM, formatPrice } from '@/lib/packages';

export interface Pick {
  date: string | null;
  start: string | null;
}

interface SummaryProps {
  picks: Pick[];
  /** The session being chosen right now (0 to 2), or -1 when none. */
  active: number;
}

const endOf = (i: number, start: string | null) => (start ? fromMin(toMin(start) + PACKAGES[i].durationMin) : null);

/** Compact one-line version for phones. */
export function SummaryBar({ picks }: SummaryProps) {
  const done = picks.filter((p) => p.date && p.start).length;
  const next = picks.findIndex((p) => !(p.date && p.start));
  return (
    <div role="group" aria-label="Your sessions" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="font-bold">
        {done} of {PROGRAM.sessionCount} sessions picked
      </span>
      {next >= 0 && <span className="text-ink-mute">Next: Session {next + 1}</span>}
      <span className="ml-auto font-bold">{formatPrice(PROGRAM.price)}</span>
    </div>
  );
}

export function Summary({ picks, active }: SummaryProps) {
  return (
    <aside aria-label="Your sessions" className="rounded-xl bg-sand-100 p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="display-md text-xl">Your sessions</p>
      <p className="mt-1 text-sm text-ink-mute">
        {PROGRAM.name}, {PROGRAM.format.toLowerCase()}
      </p>
      <ol className="mt-4 grid gap-4">
        {PACKAGES.map((pkg, i) => {
          const p = picks[i];
          const end = endOf(i, p?.start ?? null);
          return (
            <li key={pkg.id} className={cn('flex gap-3 rounded-lg p-2 -m-2', active === i && 'bg-white ring-2 ring-sunset/60')}>
              <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold', p?.date && p.start ? 'bg-river text-white' : 'bg-sand-300 text-ink-soft')} aria-hidden>
                {i + 1}
              </span>
              <span className="min-w-0 text-sm">
                <span className="block font-semibold">
                  Session {pkg.number}: {pkg.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-ink-soft">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-river" aria-hidden />
                  <span className={p?.date ? 'font-semibold text-ink' : 'text-ink-mute'}>{p?.date ? fmtDateLong(p.date) : 'Pick a date'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-river" aria-hidden />
                  <span className={p?.start && end ? 'font-semibold text-ink' : 'text-ink-mute'}>{p?.start && end ? fmtRange(p.start, end) : 'Pick a start time'}</span>
                </span>
                <span className="flex items-start gap-1.5 text-ink-mute">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-river" aria-hidden />
                  {pkg.number === 1 ? 'Backyard start. The address appears when you book.' : `${MEETING.spot} at ${MEETING.road}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <dl className="mt-5 grid gap-1.5 border-t border-sand-300 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">All {PROGRAM.sessionCount} sessions</dt>
          <dd>{formatPrice(PROGRAM.price)}</dd>
        </div>
        <div className="mt-1 flex justify-between border-t border-sand-300 pt-2 text-base font-bold">
          <dt>Total, paid in person</dt>
          <dd>{formatPrice(PROGRAM.price)}</dd>
        </div>
      </dl>

      <p className="mt-5 flex gap-2.5 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-river" aria-hidden />
        {PROGRAM.jig}. Nothing to pay to reserve, and weather days reschedule free.
      </p>
    </aside>
  );
}
