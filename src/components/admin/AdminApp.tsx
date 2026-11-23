'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, CalendarCheck, CalendarRange, ClipboardList, Compass, Images, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getPackage } from '@/lib/packages';
import { fmtDateShort } from '@/lib/time';
import type { BookingsPayload } from '@/lib/types';
import { useRemote } from '@/hooks/useRemote';
import { LogoMark } from '../site/Logo';
import { AvailabilityManager } from './AvailabilityManager';
import { BookingsDashboard, type Filter } from './BookingsDashboard';
import { CalendarModal } from './CalendarModal';
import { CommandCenter } from './CommandCenter';
import { NotificationsTab } from './NotificationsTab';
import { PhotoManager } from './PhotoManager';
import { ToastProvider, useToast } from './Toast';

type Tab = 'command' | 'bookings' | 'availability' | 'alerts' | 'photos';
const TABS: Array<{ id: Tab; label: string; short: string; icon: typeof ClipboardList }> = [
  { id: 'command', label: 'Command', short: 'Command', icon: Compass },
  { id: 'bookings', label: 'Bookings', short: 'Bookings', icon: ClipboardList },
  { id: 'availability', label: 'Availability', short: 'Times', icon: CalendarRange },
  { id: 'alerts', label: 'Alerts', short: 'Alerts', icon: BellRing },
  { id: 'photos', label: 'Photos', short: 'Photos', icon: Images },
];

function Shell() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('command');
  const [filter, setFilter] = useState<Filter>('today');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const bookings = useRemote<BookingsPayload>('/api/bookings', 15_000);
  const seen = useRef<Set<string> | null>(null);

  // Restore the tab from the URL hash after mount (kept out of the initial render to avoid hydration drift).
  useEffect(() => {
    const h = window.location.hash.replace('#', '') as Tab;
    if (TABS.some((t) => t.id === h)) setTab(h);
  }, []);

  const choose = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0 });
  };
  const openBookings = (f: Filter) => {
    setFilter(f);
    choose('bookings');
  };

  // Real-time heads-up when a new booking lands while this portal is open.
  useEffect(() => {
    const list = bookings.data?.bookings;
    if (!list) return;
    if (seen.current === null) {
      seen.current = new Set(list.map((b) => b.id));
      return;
    }
    for (const b of list) {
      if (!seen.current.has(b.id)) {
        seen.current.add(b.id);
        toast.info(`New booking: ${b.name}, ${getPackage(b.packageId)?.name ?? 'lesson'} on ${fmtDateShort(b.date)}`);
      }
    }
  }, [bookings.data, toast]);

  const pending = bookings.data?.bookings.filter((b) => b.status === 'pending').length ?? 0;
  const expired = bookings.status === 401;

  async function logout() {
    await api('/api/auth', { method: 'DELETE' }).catch(() => undefined);
    router.refresh();
  }

  const badge = (id: Tab) =>
    id === 'bookings' && pending > 0 ? (
      <span className="rounded-full bg-sunset px-2 py-0.5 text-xs font-bold text-river-950" aria-label={`${pending} need approval`}>
        {pending}
      </span>
    ) : null;

  return (
    <div className="min-h-[100svh] bg-sand-100 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 bg-river-900 pt-[env(safe-area-inset-top)] text-white">
        <div className="container-x flex h-16 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <LogoMark className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <div className="min-w-0 leading-tight">
              <p className="display-md whitespace-nowrap text-lg sm:text-xl">Command Center</p>
              <p className="hidden text-xs text-white/60 sm:block">Boaz Fishing Co.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => setCalendarOpen(true)} className="btn-primary btn-sm" data-testid="integrate-calendar">
              <CalendarCheck className="h-4 w-4" aria-hidden />
              <span className="min-[400px]:hidden">Calendar</span>
              <span className="hidden min-[400px]:inline">Integrate Calendar</span>
            </button>
            <a href="/" className="hidden rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:block">
              View site
            </a>
            <button type="button" onClick={() => void logout()} aria-label="Log out" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 sm:w-auto sm:gap-2 sm:px-3">
              <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden text-sm font-semibold sm:inline">Log out</span>
            </button>
          </div>
        </div>
        {/* Tabs on larger screens; phones get the bottom bar instead */}
        <div className="container-x hidden md:block">
          <div role="tablist" aria-label="Portal sections" className="-mb-px flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                type="button"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => choose(id)}
                className={cn('flex min-h-[48px] items-center gap-2 rounded-t-lg px-4 text-[15px] font-semibold transition-colors', tab === id ? 'bg-sand-100 text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white')}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {label}
                {badge(id)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {expired && (
        <div role="alert" className="bg-red-700 px-4 py-3 text-center text-sm font-semibold text-white">
          Your session expired.{' '}
          <button type="button" className="underline" onClick={() => router.refresh()}>
            Sign in again
          </button>
        </div>
      )}

      <main className="container-x py-5 sm:py-8">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'command' && <CommandCenter remote={bookings} onOpenBookings={openBookings} />}
          {tab === 'bookings' && <BookingsDashboard remote={bookings} filter={filter} onFilter={setFilter} />}
          {tab === 'availability' && <AvailabilityManager />}
          {tab === 'alerts' && <NotificationsTab />}
          {tab === 'photos' && <PhotoManager />}
        </div>
      </main>

      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-river-950 pb-[env(safe-area-inset-bottom)] text-white backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map(({ id, short, icon: Icon }) => (
            <li key={id}>
              <button type="button" onClick={() => choose(id)} aria-current={tab === id ? 'page' : undefined} className={cn('relative flex min-h-[60px] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', tab === id ? 'text-sunset-400' : 'text-white/70')}>
                <Icon className="h-6 w-6" aria-hidden />
                {short}
                {id === 'bookings' && pending > 0 && <span className="absolute right-[22%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sunset px-1 text-[10px] font-bold text-river-950">{pending}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {calendarOpen && <CalendarModal onClose={() => setCalendarOpen(false)} />}
    </div>
  );
}

export function AdminApp() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
