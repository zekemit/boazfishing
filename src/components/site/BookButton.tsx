'use client';

import { useBooking } from './BookingContext';
import type { PackageId } from '@/lib/types';

interface BookButtonProps {
  className: string;
  children: React.ReactNode;
  packageId?: PackageId;
}

/** Scrolls to the scheduler, optionally pre-selecting a lesson. */
export function BookButton({ className, children, packageId }: BookButtonProps) {
  const { scrollToBook, selectPackage } = useBooking();
  return (
    <button type="button" className={className} onClick={() => (packageId ? selectPackage(packageId) : scrollToBook())}>
      {children}
    </button>
  );
}
