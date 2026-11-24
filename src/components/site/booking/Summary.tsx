import { CalendarDays, Clock, Fish, MapPin, ShieldCheck, Users } from 'lucide-react';
import { MEETING, meetingWhere } from '@/content/site';
import { fmtDateLong, fmtDateShort, fmtRange, fromMin, toMin } from '@/lib/time';
import { formatPrice, priceFor, type LessonPackage } from '@/lib/packages';

interface SummaryProps {
  pkg: LessonPackage | undefined;
  date: string | null;
  start: string | null;
  anglers: number;
  showAnglers: boolean;
}

/** Compact one-line version for phones. */
export function SummaryBar({ pkg, date, start, anglers, showAnglers }: SummaryProps) {
  if (!pkg) return null;
  const end = start ? fromMin(toMin(start) + pkg.durationMin) : null;
  return (
    <div role="group" aria-label="Your lesson" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="flex items-center gap-1.5 font-bold">
        <Fish className="h-4 w-4 text-river" aria-hidden /> {pkg.name}
      </span>
      <span className={date ? 'font-semibold' : 'text-ink-mute'}>{date ? fmtDateShort(date) : 'Pick a date'}</span>
      <span className={start && end ? 'font-semibold' : 'text-ink-mute'}>{start && end ? fmtRange(start, end) : 'Pick a time'}</span>
      {showAnglers && (
        <span className="font-semibold">
          {anglers} {anglers === 1 ? 'angler' : 'anglers'}
        </span>
      )}
      <span className="ml-auto font-bold">{formatPrice(priceFor(pkg, anglers))}</span>
    </div>
  );
}

export function Summary({ pkg, date, start, anglers, showAnglers }: SummaryProps) {
  const end = pkg && start ? fromMin(toMin(start) + pkg.durationMin) : null;
  const extra = pkg ? Math.max(0, anglers - pkg.includedAnglers) : 0;
  return (
    <aside aria-label="Your lesson" className="rounded-xl bg-sand-100 p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="display-md text-xl">Your lesson</p>
      {!pkg ? (
        <p className="mt-3 text-ink-soft">Choose a lesson to get started. Your picks show up here.</p>
      ) : (
        <ul className="mt-4 grid gap-3.5">
          <li className="flex gap-3">
            <Fish className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
            <span>
              <span className="block font-semibold">{pkg.name}</span>
              <span className="text-sm text-ink-mute">{pkg.durationLabel} on the water</span>
            </span>
          </li>
          <li className="flex gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
            <span className={date ? 'font-semibold' : 'text-ink-mute'}>{date ? fmtDateLong(date) : 'Pick a date'}</span>
          </li>
          <li className="flex gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
            <span className={start && end ? 'font-semibold' : 'text-ink-mute'}>
              {start && end ? fmtRange(start, end) : 'Pick a start time'}
            </span>
          </li>
          <li className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
            <span>
              {pkg.id === 'first-cast' ? (
                <>
                  <span className="block font-semibold">Backyard start</span>
                  <span className="text-sm text-ink-mute">Your meeting address appears when you book</span>
                </>
              ) : (
                <>
                  <span className="block font-semibold">{MEETING.spot}</span>
                  <span className="text-sm text-ink-mute">{meetingWhere()}</span>
                </>
              )}
            </span>
          </li>
          {showAnglers && (
            <li className="flex gap-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-river" aria-hidden />
              <span className="font-semibold">
                {anglers} {anglers === 1 ? 'angler' : 'anglers'}
              </span>
            </li>
          )}
        </ul>
      )}

      {pkg && (
        <dl className="mt-5 grid gap-1.5 border-t border-sand-300 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">
              {pkg.name}, up to {pkg.includedAnglers}
            </dt>
            <dd>{formatPrice(pkg.basePrice)}</dd>
          </div>
          {extra > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">
                {extra} extra {extra === 1 ? 'angler' : 'anglers'}
              </dt>
              <dd>{formatPrice(extra * pkg.extraAnglerPrice)}</dd>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-sand-300 pt-2 text-base font-bold">
            <dt>Total, paid in person</dt>
            <dd>{formatPrice(priceFor(pkg, anglers))}</dd>
          </div>
        </dl>
      )}

      <p className="mt-5 flex gap-2.5 text-sm text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-river" aria-hidden />
        All gear provided. Nothing to pay to reserve, and weather days reschedule free.
      </p>
    </aside>
  );
}
