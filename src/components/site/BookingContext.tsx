'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface BookingContextValue {
  preferredDate: string | null;
  /** Bumps every time a "book" button / hero shortcut is used, so the scheduler can react. */
  signal: number;
  /** Open the scheduler at the first session (optionally with a date pre-selected), then scroll to it. */
  startBooking: (date?: string) => void;
  scrollToBook: () => void;
}

const Ctx = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [signal, setSignal] = useState(0);

  const scrollToBook = useCallback(() => {
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const startBooking = useCallback(
    (date?: string) => {
      setPreferredDate(date ?? null);
      setSignal((n) => n + 1);
      scrollToBook();
    },
    [scrollToBook],
  );

  const value = useMemo(() => ({ preferredDate, signal, startBooking, scrollToBook }), [preferredDate, signal, startBooking, scrollToBook]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking(): BookingContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBooking must be used inside <BookingProvider>');
  return v;
}
