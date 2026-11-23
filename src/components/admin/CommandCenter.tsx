'use client';

import { useMemo } from 'react';
import { CircleDollarSign, Clock, Fish, GraduationCap } from 'lucide-react';
import { formatPrice } from '@/lib/packages';
import { cn } from '@/lib/cn';
import { fmtDateLong, toMin } from '@/lib/time';
import type { Booking, BookingsPayload } from '@/lib/types';
import type { Remote } from '@/hooks/useRemote';
import { BookingCard } from './BookingCard';
import { TideWidget } from './TideWidget';
import { useBookingActions } from './useBookingActions';
import type { Filter } from './BookingsDashboard';

const hoursOf = (b: Booking) => (toMin(b.end) - toMin(b.start)) / 60;
const fmtHours = (h: number) => `${Math.round(h * 10) / 10}`;

/** Summary cards: what's coming, what's done, time on the water, and the summer's money. */
function KpiBar({ bookings, today }: { bookings: Booking[]; today: string }) {
  const k = useMemo(() => {
    const active = (b: Booking) => b.status === 'pending' || b.status === 'confirmed';
    const upcoming = bookings.filter((b) => active(b) && b.date >= today);
    const done = bookings.filter((b) => b.status === 'completed');
    const year = Number(today.slice(0, 4));
    const summerYear = Number(today.slice(5, 7)) <= 8 ? year : year + 1;
    const inSummer = (b: Booking) => b.date >= `${summerYear}-06-01` && b.date <= `${summerYear}-08-31`;
    const collected = done.filter(inSummer).reduce((s, b) => s + b.totalPrice, 0);
    const booked = upcoming.filter(inSummer).reduce((s, b) => s + b.totalPrice, 0);
    const students = new Set(done.map((b) => b.email.toLowerCase()));
    const counts = new Map<string, number>();
    bookings.filter((b) => b.status !== 'cancelled').forEach((b) => counts.set(b.email.toLowerCase(), (counts.get(b.email.toLowerCase()) ?? 0) + 1));
    return {
      upcoming: upcoming.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      taught: done.length,
      students: students.size,
      returning: [...counts.values()].filter((n) => n > 1).length,
      hours: done.reduce((s, b) => s + hoursOf(b), 0),
      hoursAhead: upcoming.reduce((s, b) => s + hoursOf(b), 0),
      collected,
      booked,
      summerYear,
    };
  }, [bookings, today]);

  const cards = [
    { icon: Fish, label: 'Upcoming lessons', value: String(k.upcoming), sub: k.pending ? `${k.pending} need approval` : 'All approved', hot: k.pending > 0, id: 'kpi-upcoming' },
    { icon: GraduationCap, label: 'Lessons taught', value: String(k.taught), sub: `${k.students} student${k.students === 1 ? '' : 's'}, ${k.returning} returning`, id: 'kpi-taught' },
    { icon: Clock, label: 'Hours on the water', value: fmtHours(k.hours), sub: `+${fmtHours(k.hoursAhead)} h booked ahead`, id: 'kpi-hours' },
    { icon: CircleDollarSign, label: `Summer ${k.summerYear} revenue`, value: formatPrice(k.collected + k.booked), sub: `${formatPrice(k.collected)} collected, ${formatPrice(k.booked)} booked`, id: 'kpi-revenue' },
  ];
  return (
    <section aria-label="Summer performance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, sub, hot, id }) => (
        <div key={label} className={cn('rounded-2xl border bg-white p-4 sm:p-5', hot ? 'border-sunset' : 'border-sand-300')} data-testid={id}>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-mute">
            <Icon className={cn('h-4 w-4', hot ? 'text-sunset-600' : 'text-river')} aria-hidden /> {label}
          </p>
          <p className="display mt-1 text-4xl sm:text-5xl">{value}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{sub}</p>
        </div>
      ))}
    </section>
  );
}

export function CommandCenter({ remote, onOpenBookings }: { remote: Remote<BookingsPayload>; onOpenBookings: (f: Filter) => void }) {
  const { data, refresh } = remote;
  const actions = useBookingActions(refresh);
  const today = data?.today ?? '';
  const all = data?.bookings ?? [];
  const todays = all.filter((b) => b.date === today && (b.status === 'pending' || b.status === 'confirmed')).sort((a, b) => a.start.localeCompare(b.start));
  const pending = all.filter((b) => b.status === 'pending').length;
  const nextUp = all.filter((b) => (b.status === 'pending' || b.status === 'confirmed') && b.date > today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];

  return (
    <div className="grid gap-5">
      <TideWidget />
      {data ? <KpiBar bookings={all} today={today} /> : <div className="h-28 animate-pulse rounded-2xl bg-sand-200" />}

      {pending > 0 && (
        <button type="button" onClick={() => onOpenBookings('pending')} className="flex items-center justify-between gap-3 rounded-2xl border border-sunset bg-sunset-50 px-5 py-4 text-left">
          <span className="font-bold text-sunset-700">
            {pending} new {pending === 1 ? 'booking needs' : 'bookings need'} your approval
          </span>
          <span className="btn-primary btn-sm pointer-events-none">Review</span>
        </button>
      )}

      <section aria-label="Today's agenda">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display-md text-2xl">Today’s agenda{today && <span className="ml-2 text-lg font-semibold text-ink-mute">{fmtDateLong(today)}</span>}</h2>
          <button type="button" onClick={() => onOpenBookings('week')} className="text-sm font-semibold text-river underline underline-offset-4">
            See this week
          </button>
        </div>
        <div className="mt-3 grid gap-4" data-testid="agenda-list">
          {todays.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-sand-400 bg-white p-6 text-ink-soft">
              No lessons today.{nextUp ? ` Next up: ${fmtDateLong(nextUp.date)} with ${nextUp.name}.` : ' New bookings will show up here.'}
            </p>
          ) : (
            todays.map((b) => <BookingCard key={b.id} booking={b} all={all} today={today} tz={data?.tz ?? 'America/New_York'} actions={actions} />)
          )}
        </div>
      </section>
    </div>
  );
}
