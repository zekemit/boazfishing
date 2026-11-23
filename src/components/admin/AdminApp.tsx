'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, ClipboardList, Images, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { getPackage } from '@/lib/packages';
import { fmtDateShort } from '@/lib/time';
import type { BookingsPayload } from '@/lib/types';
import { useRemote } from '@/hooks/useRemote';
import { LogoMark } from '../site/Logo';
import { AvailabilityManager } from './AvailabilityManager';
import { BookingsDashboard } from './BookingsDashboard';
import { PhotoManager } from './PhotoManager';
import { ToastProvider, useToast } from './Toast';

type Tab = 'bookings' | 'availability' | 'photos';
const TABS: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [
  { id: 'bookings', label: 'Bookings', icon: ClipboardList },
  { id: 'availability', label: 'Availability', icon: CalendarRange },
  { id: 'photos', label: 'Photos', icon: Images },
];

function Shell() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('bookings');
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

  return (
    <div className="min-h-[100svh] bg-sand-100">
      <header className="bg-river-900 text-white">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <LogoMark className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <div className="min-w-0 leading-tight">
              <p className="display-md whitespace-nowrap text-lg sm:text-xl">Instructor portal</p>
              <p className="hidden text-xs text-white/60 sm:block">Boaz Fishing Co.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-3">
            <a href="/" className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-white/10 sm:px-3">
              View site
            </a>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Log out"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-white/10 sm:px-3"
            >
              <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
        <div className="container-x">
          <div role="tablist" aria-label="Portal sections" className="-mb-px flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                type="button"
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                onClick={() => choose(id)}
                className={cn(
                  'flex min-h-[48px] shrink-0 items-center gap-2 rounded-t-lg px-3 text-[15px] font-semibold transition-colors sm:px-4',
                  tab === id ? 'bg-sand-100 text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="hidden h-[18px] w-[18px] sm:block" aria-hidden />
                {label}
                {id === 'bookings' && pending > 0 && (
                  <span className="rounded-full bg-sunset px-2 py-0.5 text-xs font-bold text-river-950" aria-label={`${pending} need approval`}>
                    {pending}
                  </span>
                )}
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

      <main className="container-x py-6 sm:py-8">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'bookings' && <BookingsDashboard remote={bookings} />}
          {tab === 'availability' && <AvailabilityManager />}
          {tab === 'photos' && <PhotoManager />}
        </div>
      </main>
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
