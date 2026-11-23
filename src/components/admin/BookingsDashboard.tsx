'use client';

import { Fragment, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { notifyChange } from '@/lib/sync';
import { addDays, fmtDateLong } from '@/lib/time';
import type { Booking, BookingsPayload } from '@/lib/types';
import type { Remote } from '@/hooks/useRemote';
import { BookingCard, dayTag } from './BookingCard';
import { useBookingActions } from './useBookingActions';
import { useToast } from './Toast';

export type Filter = 'today' | 'week' | 'pending' | 'upcoming' | 'completed' | 'cancelled' | 'all';

const EMPTY: Record<Filter, string> = {
  today: 'No lessons today. Check the tide and enjoy the water.',
  week: 'Nothing on the schedule for the next 7 days.',
  pending: 'Nothing waiting on you. Every booking has been reviewed.',
  upcoming: 'No upcoming lessons yet. New bookings show up here within seconds.',
  completed: 'No completed lessons yet.',
  cancelled: 'No cancellations.',
  all: 'No bookings yet.',
};

export function BookingsDashboard({ remote, filter, onFilter }: { remote: Remote<BookingsPayload>; filter: Filter; onFilter: (f: Filter) => void }) {
  const toast = useToast();
  const { data, error, loading, refresh } = remote;
  const actions = useBookingActions(refresh);
  const [confirmClear, setConfirmClear] = useState(false);

  const today = data?.today ?? '';
  const tz = data?.tz ?? 'America/New_York';
  const all = useMemo(() => data?.bookings ?? [], [data]);

  const groups = useMemo(() => {
    const active = (b: Booking) => b.status === 'pending' || b.status === 'confirmed';
    const asc = (a: Booking, b: Booking) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
    const desc = (a: Booking, b: Booking) => asc(b, a);
    const weekEnd = today ? addDays(today, 6) : '';
    return {
      today: all.filter((b) => active(b) && b.date === today).sort(asc),
      week: all.filter((b) => active(b) && b.date >= today && b.date <= weekEnd).sort(asc),
      pending: all.filter((b) => b.status === 'pending').sort(asc),
      upcoming: all.filter((b) => active(b) && b.date >= today).sort(asc),
      completed: all.filter((b) => b.status === 'completed').sort(desc),
      cancelled: all.filter((b) => b.status === 'cancelled').sort(desc),
      all: [...all].sort(desc),
    } satisfies Record<Filter, Booking[]>;
  }, [all, today]);

  const list = groups[filter];
  const sampleCount = all.filter((b) => b.sample).length;
  const grouped = filter === 'week' || filter === 'upcoming' || filter === 'pending';

  async function clearSamples() {
    try {
      const r = await api<{ removed: number }>('/api/bookings?sample=true', { method: 'DELETE' });
      await refresh();
      notifyChange();
      setConfirmClear(false);
      toast.success(`Removed ${r.removed} sample ${r.removed === 1 ? 'booking' : 'bookings'}.`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'pending', label: 'Pending' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div>
      {sampleCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunset-50 px-4 py-3 text-[15px] text-sunset-700">
          <p>
            <strong>{sampleCount}</strong> of these are sample bookings. They hold real time slots until you clear them.
          </p>
          {confirmClear ? (
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => void clearSamples()} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">
                Yes, remove them
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-sunset-100">
                Keep
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-sunset-100">
              <Trash2 className="h-4 w-4" aria-hidden /> Clear sample bookings
            </button>
          )}
        </div>
      )}

      <div role="tablist" aria-label="Filter bookings" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => onFilter(t.id)}
            className={cn('flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold', filter === t.id ? 'border-river bg-river text-white' : 'border-sand-300 bg-white hover:border-river/40')}
          >
            {t.label}
            <span className={cn('rounded-full px-2 text-xs font-bold', filter === t.id ? 'bg-white/20' : 'bg-sand-200')}>{groups[t.id].length}</span>
          </button>
        ))}
      </div>

      {error && !data && (
        <p role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 font-medium text-red-800">
          {error}
        </p>
      )}

      <div className="mt-5 grid gap-4" data-testid="booking-list">
        {loading && !data && <div className="h-40 animate-pulse rounded-xl bg-sand-200" />}
        {data && list.length === 0 && <p className="rounded-xl border border-dashed border-sand-400 p-8 text-center text-ink-soft">{EMPTY[filter]}</p>}
        {list.map((b, i) => (
          <Fragment key={b.id}>
            {grouped && (i === 0 || list[i - 1].date !== b.date) && (
              <h3 className="display-md mt-2 flex flex-wrap items-baseline gap-2 text-xl">
                {fmtDateLong(b.date)}
                {dayTag(b.date, today) && <span className="rounded-full bg-river px-2.5 py-0.5 text-xs font-bold text-white">{dayTag(b.date, today)}</span>}
              </h3>
            )}
            <BookingCard booking={b} all={all} today={today} tz={tz} actions={actions} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
