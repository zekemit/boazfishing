'use client';

import { useMemo, useState } from 'react';
import { Check, CheckCheck, Mail, Phone, RotateCcw, Trash2, Users, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPrice, getPackage } from '@/lib/packages';
import { notifyChange } from '@/lib/sync';
import { diffDays, fmtDateLong, fmtRange } from '@/lib/time';
import { EXPERIENCE_LABELS, type Booking, type BookingStatus, type BookingsPayload } from '@/lib/types';
import type { Remote } from '@/hooks/useRemote';
import { useToast } from './Toast';

type Filter = 'upcoming' | 'pending' | 'completed' | 'cancelled' | 'all';

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-sunset-100 text-sunset-700',
  confirmed: 'bg-river-100 text-river-700',
  completed: 'bg-sand-200 text-ink-soft',
  cancelled: 'bg-red-100 text-red-800',
};
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Needs approval',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function dayTag(date: string, today: string): string | null {
  const d = diffDays(date, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 1 && d < 7) return `In ${d} days`;
  return null;
}

function BookingCard({ booking, today, onAction }: { booking: Booking; today: string; onAction: (b: Booking, s: BookingStatus) => Promise<void> }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const pkg = getPackage(booking.packageId);
  const tag = booking.status === 'cancelled' || booking.status === 'completed' ? null : dayTag(booking.date, today);

  const run = async (s: BookingStatus) => {
    setBusy(true);
    await onAction(booking, s);
    setBusy(false);
    setConfirmCancel(false);
  };

  return (
    <article
      data-testid="booking-card"
      data-status={booking.status}
      className={cn(
        'rounded-xl border bg-white p-5 sm:p-6',
        booking.status === 'pending' ? 'border-sunset/60' : 'border-sand-300',
        booking.status === 'cancelled' && 'opacity-75',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', STATUS_STYLE[booking.status])}>{STATUS_LABEL[booking.status]}</span>
            {tag && <span className="rounded-full bg-river px-2.5 py-1 text-xs font-bold text-white">{tag}</span>}
            {booking.sample && <span className="rounded-full border border-sand-400 px-2.5 py-1 text-xs font-semibold text-ink-mute">Sample</span>}
            <span className="text-xs font-semibold tracking-wide text-ink-mute">{booking.code}</span>
          </div>
          <h3 className="display-md mt-2.5 text-2xl">{fmtDateLong(booking.date)}</h3>
          <p className="font-semibold text-ink-soft">{fmtRange(booking.start, booking.end)}</p>
        </div>
        <div className="sm:text-right">
          <p className="display-md text-xl">{pkg?.name ?? booking.packageId}</p>
          <p className="text-sm text-ink-mute">{pkg?.durationLabel}</p>
          <p className="mt-1 font-bold">{formatPrice(booking.totalPrice)} due in person</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-sand-200 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-lg font-bold">{booking.name}</p>
          <ul className="mt-1.5 grid gap-1.5 text-[15px]">
            <li>
              <a href={`tel:${booking.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 text-river hover:underline">
                <Phone className="h-4 w-4" aria-hidden /> {booking.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${booking.email}`} className="inline-flex items-center gap-2 break-all text-river hover:underline">
                <Mail className="h-4 w-4 shrink-0" aria-hidden /> {booking.email}
              </a>
            </li>
            <li className="flex items-center gap-2 text-ink-soft">
              <Users className="h-4 w-4" aria-hidden /> {booking.anglers} {booking.anglers === 1 ? 'angler' : 'anglers'}, {EXPERIENCE_LABELS[booking.experience].toLowerCase()}
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-mute">Notes</p>
          <p className="prose-serif mt-1 text-ink-soft">{booking.notes || <span className="text-ink-mute">No notes.</span>}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sand-200 pt-4">
        {booking.status === 'pending' && (
          <button type="button" disabled={busy} onClick={() => void run('confirmed')} className="btn-dark btn-sm">
            <Check className="h-4 w-4" aria-hidden /> Approve
          </button>
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <button type="button" disabled={busy} onClick={() => void run('completed')} className="btn-outline btn-sm">
            <CheckCheck className="h-4 w-4" aria-hidden /> Mark completed
          </button>
        )}
        {booking.status === 'completed' && (
          <button type="button" disabled={busy} onClick={() => void run('confirmed')} className="btn-outline btn-sm">
            <RotateCcw className="h-4 w-4" aria-hidden /> Undo completed
          </button>
        )}
        {booking.status === 'cancelled' && (
          <button type="button" disabled={busy} onClick={() => void run('pending')} className="btn-outline btn-sm">
            <RotateCcw className="h-4 w-4" aria-hidden /> Restore booking
          </button>
        )}
        {booking.status !== 'cancelled' &&
          (confirmCancel ? (
            <span className="ml-auto flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5">
              <span className="text-sm font-semibold text-red-800">Cancel and free this time slot?</span>
              <button type="button" disabled={busy} onClick={() => void run('cancelled')} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800">
                Yes, cancel
              </button>
              <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-red-100">
                Keep it
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
              className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" aria-hidden /> Cancel lesson
            </button>
          ))}
      </div>
    </article>
  );
}

export function BookingsDashboard({ remote }: { remote: Remote<BookingsPayload> }) {
  const toast = useToast();
  const { data, error, loading, refresh } = remote;
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [confirmClear, setConfirmClear] = useState(false);

  const today = data?.today ?? '';
  const all = useMemo(() => data?.bookings ?? [], [data]);

  const groups = useMemo(() => {
    const active = (b: Booking) => b.status === 'pending' || b.status === 'confirmed';
    const upcoming = all.filter((b) => active(b) && b.date >= today);
    const asc = (a: Booking, b: Booking) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);
    const desc = (a: Booking, b: Booking) => asc(b, a);
    return {
      upcoming: upcoming.sort(asc),
      pending: all.filter((b) => b.status === 'pending').sort(asc),
      completed: all.filter((b) => b.status === 'completed').sort(desc),
      cancelled: all.filter((b) => b.status === 'cancelled').sort(desc),
      all: [...all].sort(desc),
    } satisfies Record<Filter, Booking[]>;
  }, [all, today]);

  const revenue = groups.upcoming.reduce((sum, b) => sum + b.totalPrice, 0);
  const sampleCount = all.filter((b) => b.sample).length;
  const list = groups[filter];

  async function onAction(b: Booking, status: BookingStatus) {
    try {
      await api('/api/bookings', { method: 'PATCH', json: { id: b.id, status } });
      await refresh();
      notifyChange();
      const name = b.name.split(' ')[0];
      toast.success(
        status === 'confirmed'
          ? `Approved ${name}'s lesson.`
          : status === 'completed'
            ? `Marked ${name}'s lesson completed.`
            : status === 'cancelled'
              ? `Cancelled. That time is open on the public calendar again.`
              : `Restored ${name}'s booking.`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
      await refresh();
    }
  }

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

  const tabs: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
    { id: 'pending', label: 'Needs approval', count: groups.pending.length },
    { id: 'completed', label: 'Completed', count: groups.completed.length },
    { id: 'cancelled', label: 'Cancelled', count: groups.cancelled.length },
    { id: 'all', label: 'All', count: all.length },
  ];

  const empty: Record<Filter, string> = {
    upcoming: 'No upcoming lessons yet. When someone books on the public site, it shows up here within seconds.',
    pending: 'Nothing waiting on you. Every booking has been reviewed.',
    completed: 'No completed lessons yet.',
    cancelled: 'No cancellations.',
    all: 'No bookings yet.',
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-sunset/50 bg-white p-5">
          <p className="text-sm font-semibold text-ink-mute">Needs approval</p>
          <p className="display mt-1 text-4xl" data-testid="stat-pending">{groups.pending.length}</p>
        </div>
        <div className="rounded-xl border border-sand-300 bg-white p-5">
          <p className="text-sm font-semibold text-ink-mute">Upcoming lessons</p>
          <p className="display mt-1 text-4xl" data-testid="stat-upcoming">{groups.upcoming.length}</p>
        </div>
        <div className="rounded-xl border border-sand-300 bg-white p-5">
          <p className="text-sm font-semibold text-ink-mute">Expected in person</p>
          <p className="display mt-1 text-4xl">{formatPrice(revenue)}</p>
        </div>
      </div>

      {sampleCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunset-50 px-4 py-3 text-[15px] text-sunset-700">
          <p>
            <strong>{sampleCount}</strong> of these are sample bookings so you can try things out. They hold real time slots until you clear them.
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

      <div role="tablist" aria-label="Filter bookings" className="mt-6 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold',
              filter === t.id ? 'border-river bg-river text-white' : 'border-sand-300 bg-white hover:border-river/40',
            )}
          >
            {t.label}
            <span className={cn('rounded-full px-2 text-xs font-bold', filter === t.id ? 'bg-white/20' : 'bg-sand-200')}>{t.count}</span>
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
        {data && list.length === 0 && <p className="rounded-xl border border-dashed border-sand-400 p-8 text-center text-ink-soft">{empty[filter]}</p>}
        {list.map((b) => (
          <BookingCard key={b.id} booking={b} today={today} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}
