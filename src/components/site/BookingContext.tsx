'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PackageId } from '@/lib/types';

interface BookingContextValue {
  packageId: PackageId | null;
  preferredDate: string | null;
  /** Bumps every time a package card / hero shortcut is used, so the scheduler can react. */
  signal: number;
  setPackageId: (id: PackageId | null) => void;
  /** Pre-select a package (and optionally a date) in the scheduler, then scroll to it. */
  selectPackage: (id: PackageId, date?: string) => void;
  scrollToBook: () => void;
}

const Ctx = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [packageId, setPackageId] = useState<PackageId | null>(null);
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [signal, setSignal] = useState(0);

  const scrollToBook = useCallback(() => {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const selectPackage = useCallback(
    (id: PackageId, date?: string) => {
      setPackageId(id);
      setPreferredDate(date ?? null);
      setSignal((n) => n + 1);
      scrollToBook();
    },
    [scrollToBook],
  );

  const value = useMemo(
    () => ({ packageId, preferredDate, signal, setPackageId, selectPackage, scrollToBook }),
    [packageId, preferredDate, signal, selectPackage, scrollToBook],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking(): BookingContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBooking must be used inside <BookingProvider>');
  return v;
}
