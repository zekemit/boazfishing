'use client';

import { useBooking } from './BookingContext';

interface BookButtonProps {
  className: string;
  children: React.ReactNode;
}

/** Scrolls to the scheduler. */
export function BookButton({ className, children }: BookButtonProps) {
  const { scrollToBook } = useBooking();
  return (
    <button type="button" className={className} onClick={scrollToBook}>
      {children}
    </button>
  );
}
